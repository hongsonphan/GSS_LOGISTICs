// Màn Điều vận: tab "Phân bổ & gán xe", chế độ "Theo bước" của "Theo dõi hành trình" và tab "Quản lý Vendor".
// Dữ liệu: GET /api/vendor-admin/overview/ (nhà xe + tài khoản, link nhà xe, link tài xế),
// thao tác link tài xế: POST /api/vendor-admin/driver-links/<trip_id>/ (revoke | regenerate | set_expiry),
// tài khoản nhà xe: /api/vendor-portal-accounts/<id>/, link nhà xe: PATCH /api/vendor-allocations/<id>/.

var vaData = null;
var currentActiveVendorId = null;
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
        <div class="bg-white rounded-2xl shadow-sm w-full ${opts.extraWide ? 'max-w-4xl' : (opts.wide ? 'max-w-2xl' : 'max-w-md')} overflow-hidden border border-slate-200" role="dialog" aria-modal="true">
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
    const searchVal = ((document.getElementById('alloc-search-input') || {}).value || '').toLowerCase().trim();
    if (searchVal) {
        rows = rows.filter(l => {
            const bcode = (l.booking_code || '').toLowerCase();
            const sub = (l.subcontractor || '').toLowerCase();
            const cust = (l.customer || '').toLowerCase();
            return bcode.includes(searchVal) || sub.includes(searchVal) || cust.includes(searchVal);
        });
    }
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    set('alloc-shown-count', rows.length);
    set('alloc-total-count', total);
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Mọi phiếu phân bổ đã gán đủ xe/tài. Không có việc cần gán tiếp.</td></tr>';
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
        const route = `<div class="whitespace-nowrap font-medium text-slate-800 text-xs flex items-center gap-1.5" title="${vaEsc(l.pickup_location || '')} -> ${vaEsc(l.delivery_location || '')} -> ${vaEsc(l.dropoff_location || '')}"><span class="text-teal-700 font-bold" title="1. Lấy cont">${vaEsc(l.pickup_location || 'Cảng/Depot')}</span> <span class="text-slate-400 font-bold">&rarr;</span> <span class="text-blue-900 font-bold" title="2. Kho đóng/trả">${vaEsc(l.delivery_location || 'Kho khách')}</span> <span class="text-slate-400 font-bold">&rarr;</span> <span class="text-amber-800 font-bold" title="3. Hạ rỗng">${vaEsc(l.dropoff_location || 'Depot rỗng')}</span></div>`;
        return `
        <tr class="hover:bg-teal-50/30 cursor-pointer" onclick="vaViewUnallocatedContainersModal(${l.id})" title="Bấm để xem danh sách Container thuộc phiếu chia này">
            <td class="p-2.5 text-center text-slate-400 font-mono text-xs">${i + 1}</td>
            <td class="p-2.5"><div class="font-mono font-bold text-teal-900 text-xs">${vaEsc(l.booking_code)}</div><div class="text-xs text-slate-600">${vaEsc(l.customer)}</div></td>
            <td class="p-2.5 font-bold text-slate-800">${vaEsc(l.subcontractor)}</td>
            <td class="p-2.5 min-w-[440px] whitespace-nowrap">${route}</td>
            <td class="p-2.5 text-right font-bold tabular-nums">${l.allocated_containers}</td>
            <td class="p-2.5">
                <div class="text-xs font-bold text-slate-800 tabular-nums">${l.filled} / ${l.allocated_containers} cont đã gán xe</div>
                <div class="h-1.5 mt-1 rounded bg-slate-200 w-40"><div class="h-1.5 rounded ${left <= 0 ? 'bg-emerald-600' : 'bg-amber-500'}" style="width:${pct}%"></div></div>
            </td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5 text-xs">${vaExpiry(l.expires_at, l.expired)}</td>
            <td class="p-2.5 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                <div class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <!-- 1. Xem Cont (Hành động chính) -->
                    <button type="button" class="${VA_BTN_TEAL}" onclick="event.stopPropagation(); vaViewUnallocatedContainersModal(${l.id})" title="Xem danh sách container thuộc phiếu chia này (cont đã gán, cont chưa gán)">
                        <i class="ph-bold ph-list-magnifying-glass"></i> Xem Cont
                    </button>
                    <!-- 2. Gửi Điều Vận qua Zalo -->
                    <button type="button" class="${VA_BTN_GRAY}" onclick="vaShareVendorBatchZalo(${l.id})" title="Gửi danh sách link lệnh cho Điều vận Nhà xe qua Zalo">
                        <i class="ph-bold ph-paper-plane-tilt text-teal-700"></i> Gửi ĐV
                    </button>
                    <!-- 3. Gom Nhập/Xuất Excel vào 1 nút Dropdown gọn gàng -->
                    <div class="relative inline-block text-left" onclick="event.stopPropagation()">
                        <button type="button" class="${VA_BTN_GRAY}" onclick="vaToggleAllocExcelMenu(event, ${l.id})" title="Nhập hoặc Xuất Excel gán xe">
                            <i class="ph-bold ph-file-xls text-emerald-700"></i> Excel <i class="ph-bold ph-caret-down text-[10px] text-slate-400"></i>
                        </button>
                        <div id="alloc-excel-menu-${l.id}" class="alloc-excel-dropdown hidden absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-left">
                            <button type="button" onclick="closeAllAllocExcelDropdowns(); vaExportAllocExcel(${l.id})" class="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium">
                                <i class="ph-bold ph-file-arrow-down text-indigo-700 text-sm"></i> Xuất file mẫu
                            </button>
                            <button type="button" onclick="closeAllAllocExcelDropdowns(); vaTriggerAllocExcelUpload(${l.id})" class="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium border-t border-slate-100">
                                <i class="ph-bold ph-file-arrow-up text-emerald-700 text-sm"></i> Nhập file Excel
                            </button>
                        </div>
                    </div>
                    <!-- 4. Sao chép link Nhà xe -->
                    <button type="button" class="${VA_BTN_GRAY}" onclick="vaCopyAlloc(${l.id})" title="Sao chép link nhà xe để nhắc gán xe">
                        <i class="ph-bold ph-copy"></i> Link
                    </button>
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

// =============================================================
// TAB 3: THEO DÕI HÀNH TRÌNH (chế độ theo bước - KANBAN 7 BƯỚC CHUẨN GSS)
// =============================================================
var jboardSearchQuery = '';
var jboardFilterVendorId = '';

async function loadJourneyBoard(force) {
    const body = document.getElementById('jboard-body');
    if (!body) return;
    body.innerHTML = '<div class="p-8 text-center text-slate-400 text-sm">Đang tải ma trận hành trình xe...</div>';

    try {
        const res = await fetchWithAuth('/api/dispatch/vendor-containers/?status=ACTIVE');
        if (!res.ok) throw new Error('Không thể nạp dữ liệu hành trình');
        const resData = await res.json();
        jboardRows = resData.data || [];
        renderJourneyKanbanBoard();
    } catch (e) {
        body.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold text-sm">Lỗi tải hành trình: ${vaEsc(e.message)}</div>`;
    }
}

function renderJourneyKanbanBoard() {
    const body = document.getElementById('jboard-body');
    if (!body) return;

    let items = jboardRows || [];
    if (jboardFilterVendorId) {
        items = items.filter(x => String(x.vendor_id) === String(jboardFilterVendorId));
    }
    if (jboardSearchQuery) {
        const q = jboardSearchQuery.toLowerCase().trim();
        items = items.filter(x => {
            const cont = (x.container_number || '').toLowerCase();
            const plate = (x.tractor_plate || '').toLowerCase();
            const drv = (x.driver_name || '').toLowerCase();
            const vname = (x.vendor_name || x.vendor_short || '').toLowerCase();
            const bcode = (x.booking_code || x.dispatch_order_code || '').toLowerCase();
            return cont.includes(q) || plate.includes(q) || drv.includes(q) || vname.includes(q) || bcode.includes(q);
        });
    }

    const COLUMNS = [
        { key: 'READY', label: '1. Sẵn sàng / Nhận lệnh', badgeBg: 'bg-blue-100 text-blue-900 border-blue-200', icon: 'ph-newspaper' },
        { key: 'ARRIVED_AT_PICKUP', label: '2. Đã đến nơi nhận', badgeBg: 'bg-teal-100 text-teal-900 border-teal-200', icon: 'ph-map-pin' },
        { key: 'LOADED_ON_VEHICLE', label: '3. Nhận cont / hàng', badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200', icon: 'ph-truck' },
        { key: 'ARRIVED_AT_DELIVERY', label: '4. Đã đến nơi giao', badgeBg: 'bg-sky-100 text-sky-900 border-sky-200', icon: 'ph-warehouse' },
        { key: 'UNLOADED', label: '5. Đã giao xong / Hạ xe', badgeBg: 'bg-amber-100 text-amber-900 border-amber-200', icon: 'ph-check-circle' },
        { key: 'RETURNING_EMPTY', label: '6. Đang đi hạ rỗng', badgeBg: 'bg-purple-100 text-purple-900 border-purple-200', icon: 'ph-arrows-clockwise' },
        { key: 'EMPTY_RETURNED', label: '7. Đã hạ rỗng (Xong)', badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200', icon: 'ph-seal-check' }
    ];

    const colsMap = {};
    COLUMNS.forEach(c => colsMap[c.key] = []);

    items.forEach(it => {
        let st = it.step_status || 'READY';
        if (st === 'ASSIGNED' || st === 'DRAFT') st = 'READY';
        if (st === 'CONTAINER_PICKED' || st === 'IN_TRANSIT' || st === 'TRANSIT') st = 'LOADED_ON_VEHICLE';
        if (st === 'AT_WAREHOUSE') st = 'ARRIVED_AT_DELIVERY';
        if (st === 'DELIVERED') st = 'UNLOADED';
        if (st === 'EMPTY_RETURNING') st = 'RETURNING_EMPTY';
        if (st === 'COMPLETED') st = 'EMPTY_RETURNED';

        if (colsMap[st]) colsMap[st].push(it);
        else colsMap['READY'].push(it);
    });

    const vendorMap = new Map();
    (jboardRows || []).forEach(x => {
        if (x.vendor_id && !vendorMap.has(x.vendor_id)) {
            vendorMap.set(x.vendor_id, x.vendor_short || x.vendor_name);
        }
    });
    let vendorOpts = '<option value="">-- Tất cả nhà xe --</option>';
    vendorMap.forEach((vname, vid) => {
        vendorOpts += `<option value="${vid}" ${String(vid) === String(jboardFilterVendorId) ? 'selected' : ''}>${vaEsc(vname)}</option>`;
    });

    body.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                    <h3 class="font-bold text-slate-800 text-sm font-heading flex items-center gap-2">
                        <i class="ph-bold ph-chart-line text-teal-700"></i>
                        <span>Theo bước hành trình: xe đã nhận lệnh và đang chạy</span>
                    </h3>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                        ${items.length} container / chuyến đang theo dõi
                    </span>
                </div>
                <div class="flex items-center gap-2 flex-wrap text-xs">
                    <div class="relative min-w-[240px]">
                        <i class="ph-bold ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="jboard-search-input" value="${vaEsc(jboardSearchQuery)}"
                               placeholder="Tìm cont, biển số, tài xế, nhà xe..."
                               oninput="jboardSearchQuery = this.value; renderJourneyKanbanBoard();"
                               class="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-teal-600 outline-none">
                    </div>
                    <select id="jboard-filter-vendor" onchange="jboardFilterVendorId = this.value; renderJourneyKanbanBoard();"
                            class="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-teal-600 outline-none">
                        ${vendorOpts}
                    </select>
                    <button type="button" onclick="loadJourneyBoard(true)" class="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer">
                        <i class="ph-bold ph-arrow-counter-clockwise text-teal-600"></i>
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
                ${COLUMNS.map(col => {
                    const colItems = colsMap[col.key] || [];
                    return `
                        <div class="bg-slate-100/70 rounded-2xl border border-slate-200/90 p-3 flex flex-col min-h-[480px]">
                            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                                <span class="text-xs font-black text-slate-800 font-heading uppercase tracking-wider flex items-center gap-1">
                                    <i class="ph-bold ${col.icon} text-teal-700"></i>
                                    <span>${col.label}</span>
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-xs font-black border font-mono ${col.badgeBg}">
                                    ${colItems.length}
                                </span>
                            </div>

                            <div class="space-y-2.5 flex-1 overflow-y-auto max-h-[680px] pr-0.5">
                                ${colItems.length === 0 ? `
                                    <div class="py-12 text-center text-slate-400 text-xs italic font-medium">Không có</div>
                                ` : colItems.map(it => {
                                    const tripCode = it.trip_code || '';
                                    return `
                                        <div class="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-sm hover:border-teal-400 transition-all cursor-pointer group"
                                             onclick="${tripCode ? `viewTripDetail('${tripCode}')` : `openDispatchOrderPage(${it.booking_id})`}"
                                             title="Bấm để xem chi tiết ${tripCode ? 'Phiếu VC ' + tripCode : 'Lệnh điều động'}">
                                            
                                            <div class="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
                                                <strong class="font-mono text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors select-all">
                                                    ${vaEsc(it.container_number)}
                                                </strong>
                                                <span class="text-[10.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                                    ${vaEsc(it.container_type || '40HC')}
                                                </span>
                                            </div>

                                            <div class="mt-1.5 flex items-center justify-between text-xs">
                                                <span class="font-bold text-teal-900 truncate max-w-[140px]" title="${vaEsc(it.vendor_name)}">
                                                    <i class="ph-bold ph-buildings text-[11px] text-teal-600"></i> ${vaEsc(it.vendor_short || it.vendor_name)}
                                                </span>
                                                <span class="font-mono text-[10.5px] font-semibold text-slate-500">${vaEsc(it.dispatch_order_code || '')}</span>
                                            </div>

                                            <div class="mt-1 text-xs text-slate-700 font-medium">
                                                <div class="flex items-center gap-1 font-mono font-bold text-slate-800">
                                                    <i class="ph-bold ph-truck text-slate-400"></i>
                                                    <span>${vaEsc(it.tractor_plate || '--')}</span>
                                                </div>
                                                <div class="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                                    <span class="truncate max-w-[120px] font-semibold text-slate-700">${vaEsc(it.driver_name || '--')}</span>
                                                    ${it.driver_phone && it.driver_phone !== '--' ? `
                                                        <a href="tel:${vaEsc(it.driver_phone)}" onclick="event.stopPropagation()" class="text-teal-700 font-mono hover:underline flex items-center gap-0.5">
                                                            <i class="ph-bold ph-phone text-[10px]"></i> ${vaEsc(it.driver_phone)}
                                                        </a>
                                                    ` : ''}
                                                </div>
                                            </div>

                                            <div class="mt-1.5 pt-1.5 border-t border-slate-100 text-[10.5px] text-slate-500 font-medium truncate flex items-center gap-1"
                                                 title="${vaEsc(it.pickup_location)} -> ${vaEsc(it.delivery_location)} -> ${vaEsc(it.dropoff_location || 'Depot')}">
                                                <span class="text-teal-700 truncate max-w-[80px]">${vaEsc(it.pickup_location)}</span>
                                                <span class="text-slate-400 font-bold">&rarr;</span>
                                                <span class="text-blue-900 truncate max-w-[80px]">${vaEsc(it.delivery_location)}</span>
                                            </div>

                                            <div class="mt-2 flex items-center justify-between pt-1 text-[11px]">
                                                ${tripCode ? `
                                                    <span class="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                                                        ${tripCode}
                                                    </span>
                                                ` : `<span class="text-amber-700 font-semibold text-[10px]">Chờ VC</span>`}
                                                <span class="text-slate-400 group-hover:text-teal-700 font-bold flex items-center gap-0.5 transition-colors">
                                                    <span>Xem</span> <i class="ph-bold ph-arrow-right"></i>
                                                </span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderJourneyBoard() {
    renderJourneyKanbanBoard();
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
            actions = `
                <button type="button" class="${VA_BTN_TEAL}" onclick="vaAccountModal(${v.id})"><i class="ph ph-user-plus"></i> Cấp tài khoản</button>`;
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

            const isLocked = a.locked || !a.is_active;
            actions = `
                <button type="button" class="${VA_BTN_TEAL}" onclick="openVendorDetailPage(${v.id})" title="Xem chi tiết nhà xe, tài khoản, token, xe & tài xế"><i class="ph ph-eye"></i> Xem</button>
                ${isLocked 
                    ? `<button type="button" class="${VA_BTN_GRAY}" onclick="vaToggleLockAccount(${v.id}, false)" title="Mở khóa tài khoản Portal"><i class="ph ph-lock-open"></i> Mở khóa</button>`
                    : `<button type="button" class="${VA_BTN_ROSE}" onclick="vaToggleLockAccount(${v.id}, true)" title="Khóa tài khoản Portal"><i class="ph ph-lock"></i> Khóa</button>`
                }`;
        }
        if (!a) {
            actions = `
                <button type="button" class="${VA_BTN_TEAL}" onclick="openVendorDetailPage(${v.id})" title="Xem chi tiết nhà xe, cấp tài khoản & cấu hình token"><i class="ph ph-eye"></i> Xem</button>
                <button type="button" class="${VA_BTN_GRAY} opacity-40 cursor-not-allowed" disabled title="Nhà xe chưa có tài khoản"><i class="ph ph-lock"></i> Khóa</button>`;
        }
        return `<tr class="hover:bg-teal-50/30">
            <td class="p-2.5"><div class="font-bold text-slate-900">${vaEsc(v.short_name || v.name)}</div><div class="text-xs text-slate-500 font-mono">${vaEsc(v.code)}${v.tax_code ? ' · MST: ' + vaEsc(v.tax_code) : ''}</div></td>
            <td class="p-2.5">${acctCell}</td>
            <td class="p-2.5">${tokenCell}</td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5 text-xs text-slate-600">${a && a.last_login_at ? vaFmt(a.last_login_at) : 'Chưa đăng nhập'}</td>
            <td class="p-2.5 text-xs tabular-nums"><strong>${v.links_valid}</strong> / ${v.links_total} link nhà xe<div class="text-slate-600"><strong>${v.driver_links_valid}</strong> link tài xế</div></td>
            <td class="p-2.5 text-center"><div class="inline-flex items-center gap-1.5 flex-nowrap justify-center">${actions}</div></td>
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
                <button type="button" class="${VA_BTN_TEAL}" onclick="window.open('${vaEsc(l.link)}', '_blank')" title="Mở trực tiếp Cổng Nhà Xe của phiếu chia này để xem và thao tác hộ"><i class="ph ph-desktop"></i> Màn hình Vendor</button>
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
                <button type="button" class="${VA_BTN_TEAL}" ${d.state === 'valid' ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaOpenDriverScreenDirect('${vaEsc(d.link)}', '${vaEsc(d.trip_code)}')" title="Mở trực tiếp giao diện Bác tài để xem, hướng dẫn hoặc thao tác hộ"><i class="ph ph-device-mobile"></i> Màn hình Tài xế</button>
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
    const detailView = document.getElementById('view-vendor-detail');
    if (detailView && !detailView.classList.contains('hidden-view') && currentActiveVendorId) {
        if (typeof openVendorDetailPage === 'function') {
            openVendorDetailPage(currentActiveVendorId, false);
        }
    }
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
    // Chuỗi 12 ký tự ngẫu nhiên gồm số, ký tự Hoa, thường: đảm bảo bảo mật cao
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 12; i++) {
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
                <input id="va-token-custom" class="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none uppercase" placeholder="Ví dụ: GSS-k8N2pA9xL3vQ hoặc bấm Sinh mã" value="${vaEsc(curTok)}">
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
            const vUpdated = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
            if (vUpdated) {
                if (!vUpdated.account) vUpdated.account = {};
                if (out.data.plain_token) vUpdated.account.plain_token = out.data.plain_token;
                if (out.data.confirm_token_preview) vUpdated.account.token_preview = out.data.confirm_token_preview;
                if (out.data.magic_link) vUpdated.account.magic_link = out.data.magic_link;
                if (out.data.token_expires_at !== undefined) vUpdated.account.token_expires_at = out.data.token_expires_at;
                vUpdated.account.token_expired = false;
            }
            const detailView = document.getElementById('view-vendor-detail');
            if (detailView && !detailView.classList.contains('hidden-view')) {
                openVendorDetailPage(vendorId, false);
            }
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
        if (out.data) {
            const vUpdated = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
            if (vUpdated) {
                if (!vUpdated.account) vUpdated.account = {};
                if (out.data.username) vUpdated.account.username = out.data.username;
                if (out.data.plain_token) vUpdated.account.plain_token = out.data.plain_token;
                if (out.data.confirm_token_preview) vUpdated.account.token_preview = out.data.confirm_token_preview;
                if (out.data.magic_link) vUpdated.account.magic_link = out.data.magic_link;
                if (out.data.token_expires_at !== undefined) vUpdated.account.token_expires_at = out.data.token_expires_at;
            }
            const detailView = document.getElementById('view-vendor-detail');
            if (detailView && !detailView.classList.contains('hidden-view')) {
                openVendorDetailPage(vendorId, false);
            }
            vaShowTokenResult(v.short_name, out.data);
        }
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

async function vaToggleLockAccount(vendorId, shouldLock) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    const vName = v ? (v.short_name || v.name) : 'nhà xe';
    if (shouldLock) {
        const yes = await showConfirmModal({
            type: 'danger',
            title: `Khóa tài khoản Cổng Nhà Xe: ${vName}`,
            message: `Nhà xe sẽ bị khóa và không thể đăng nhập hoặc nhận lệnh qua Cổng Nhà Xe cho đến khi được mở khóa lại. Bạn có chắc chắn muốn khóa?`,
            confirmText: 'Khóa tài khoản'
        });
        if (!yes) return;
        await vaAccountAction(vendorId, { is_active: false }, `Đã khóa tài khoản Cổng Nhà Xe của ${vName}.`);
    } else {
        await vaAccountAction(vendorId, { is_active: true, unlock: true }, `Đã mở khóa tài khoản Cổng Nhà Xe của ${vName}.`);
    }
}

function vaOpenVendorDetailModal(vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    if (!v) {
        showToast('danger', 'Không tìm thấy thông tin nhà xe.');
        return;
    }
    const a = v.account;
    const isLocked = a && (a.locked || !a.is_active);
    const hasAcct = !!a;
    const tok = a ? (a.plain_token || a.token_preview || '') : '';
    const expText = a && a.token_expires_at ? vaFmt(a.token_expires_at) : 'Vô thời hạn (Không hết hạn)';
    const magic = a && a.magic_link ? a.magic_link : '';
    const allocs = (vaData && vaData.links || []).filter(l => l.subcontractor_id === vendorId);
    const dLinks = (vaData && vaData.driver_links || []).filter(d => d.vendor_id === vendorId);
    const drivers = v.drivers || [];
    const vehicles = v.vehicles || [];

    // Trạng thái badge
    let stBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1"><i class="ph ph-user-minus"></i> Chưa cấp tài khoản</span>';
    if (hasAcct) {
        if (a.locked) {
            stBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1"><i class="ph ph-lock"></i> Đang bị khóa</span>';
        } else if (!a.is_active) {
            stBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1"><i class="ph ph-prohibit"></i> Đã tắt</span>';
        } else {
            stBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"><i class="ph ph-check-circle"></i> Đang hoạt động</span>';
        }
    }

    // Danh sách xe dạng chip
    let vehHtml = '<span class="text-slate-400 text-xs">Chưa có thông tin xe gán</span>';
    if (vehicles.length) {
        vehHtml = vehicles.map(p => `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">${vaEsc(p)}</span>`).join(' ');
    }

    // Danh sách tài xế
    let drvHtml = '<div class="text-slate-400 text-xs py-2">Chưa có thông tin tài xế gán chuyến</div>';
    if (drivers.length) {
        drvHtml = `
            <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-2">Họ & Tên Bác tài</th>
                            <th class="p-2">Điện thoại</th>
                            <th class="p-2">Chuyến xe / Xe</th>
                            <th class="p-2">Trạng thái</th>
                            <th class="p-2 text-right">Màn hình Tài xế</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${drivers.map(d => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-2 font-bold text-slate-900">${vaEsc(d.name)}</td>
                                <td class="p-2 font-mono text-slate-700">${vaEsc(d.phone || '—')}</td>
                                <td class="p-2"><span class="font-mono text-teal-800 font-bold">${vaEsc(d.latest_trip_code || '—')}</span> ${d.latest_plate ? '· ' + vaEsc(d.latest_plate) : ''}</td>
                                <td class="p-2"><span class="text-[11px] font-semibold text-slate-600">${vaEsc(d.latest_status || '—')}</span></td>
                                <td class="p-2 text-right">
                                    <button type="button" class="${VA_BTN_TEAL} text-xs py-1" onclick="vaOpenDriverScreenDirect('${vaEsc(d.link)}', '${vaEsc(d.latest_trip_code)}')" title="Mở Màn hình Tài xế (Lệnh di động)"><i class="ph ph-device-mobile"></i> Màn hình Tài xế</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // Danh sách lệnh / phiếu chia cont
    let allocHtml = '<div class="text-slate-400 text-xs py-2">Chưa có lệnh điều vận nào cho nhà xe này</div>';
    if (allocs.length) {
        allocHtml = `
            <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                            <th class="p-2">Booking / Lệnh</th>
                            <th class="p-2">Số lượng Cont</th>
                            <th class="p-2">Trạng thái Link</th>
                            <th class="p-2">Hạn dùng</th>
                            <th class="p-2 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${allocs.map(l => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-2 font-mono font-bold text-teal-900">${vaEsc(l.booking_code)}</td>
                                <td class="p-2 font-semibold">${l.filled} / ${l.allocated_containers} cont</td>
                                <td class="p-2">${l.state === 'valid' ? '<span class="text-emerald-700 font-bold">Còn hiệu lực</span>' : '<span class="text-rose-700 font-bold">Hết hạn/Khóa</span>'}</td>
                                <td class="p-2 text-slate-600">${vaExpiry(l.expires_at, l.expired)}</td>
                                <td class="p-2 text-right">
                                    <button type="button" class="${VA_BTN_TEAL} text-xs py-1" onclick="window.open('${vaEsc(l.link)}', '_blank')" title="Mở Cổng Nhà Xe cho lệnh này"><i class="ph ph-desktop"></i> Màn hình Vendor</button>
                                    <button type="button" class="${VA_BTN_GRAY} text-xs py-1" onclick="vaCopyAlloc(${l.id})"><i class="ph ph-copy"></i> Copy</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    const bodyHtml = `
        <div class="space-y-4 text-xs">
            <!-- 1. THANH TÁC VỤ NHANH TRÊN ĐẦU MODAL -->
            <div class="p-3 bg-gradient-to-r from-teal-50 via-slate-50 to-indigo-50 border border-teal-200 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700">Tác vụ nhanh:</span>
                    <button type="button" class="h-8 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors" onclick="vaOpenVendorScreenByVendorId(${v.id})" title="Mở trực tiếp Cổng Nhà Xe của ${vaEsc(v.short_name)} (đã tự điền Tên đăng nhập và Token)">
                        <i class="ph ph-desktop text-sm"></i>
                        <span>Màn hình Vendor</span>
                    </button>
                    <button type="button" class="h-8 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors" onclick="vaQuickOpenDriverForVendor(${v.id})" title="Mở Màn hình Tài xế của chuyến xe đang thực hiện">
                        <i class="ph ph-device-mobile text-sm"></i>
                        <span>Màn hình Tài xế</span>
                    </button>
                    ${hasAcct ? `<button type="button" class="h-8 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors" onclick="vaShareVendorZaloModal(${v.id})" title="Mẫu tin nhắn Zalo gửi thông tin tài khoản & Token">
                        <i class="ph ph-chat-teardrop-text text-teal-700 text-sm"></i>
                        <span>Gửi Zalo</span>
                    </button>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    ${hasAcct ? (isLocked 
                        ? `<button type="button" class="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold inline-flex items-center gap-1.5 cursor-pointer" onclick="vaToggleLockAccount(${v.id}, false)"><i class="ph ph-lock-open text-emerald-700"></i> Mở khóa tài khoản</button>`
                        : `<button type="button" class="h-8 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold inline-flex items-center gap-1.5 cursor-pointer" onclick="vaToggleLockAccount(${v.id}, true)"><i class="ph ph-lock text-rose-700"></i> Khóa tài khoản</button>`)
                        : `<button type="button" class="h-8 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 font-bold inline-flex items-center gap-1.5 cursor-pointer" onclick="vaAccountModal(${v.id})"><i class="ph ph-user-plus"></i> Cấp tài khoản ngay</button>`}
                </div>
            </div>

            <!-- 2. THÔNG TIN PHÁP LÝ & LIÊN HỆ -->
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <i class="ph ph-identification-card text-teal-700 text-sm"></i>
                        <span>Thông tin pháp lý & Liên hệ Nhà xe</span>
                    </h4>
                    <span class="font-mono text-slate-500 font-bold">Mã: ${vaEsc(v.code)}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Tên doanh nghiệp:</div>
                        <div class="font-bold text-slate-900">${vaEsc(v.name)}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Tên viết tắt / Thương hiệu:</div>
                        <div class="font-bold text-teal-900">${vaEsc(v.short_name || v.name)}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Mã số thuế (MST):</div>
                        <div class="font-mono font-bold text-slate-900">${vaEsc(v.tax_code || 'Chưa cập nhật')}</div>
                    </div>
                    <div class="lg:col-span-2">
                        <div class="text-slate-400 font-semibold mb-0.5">Địa chỉ trụ sở:</div>
                        <div class="text-slate-800">${vaEsc(v.address || 'Chưa cập nhật')}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Bãi xe / Kho bãi:</div>
                        <div class="text-slate-800">${vaEsc(v.yard_address || 'Chưa cập nhật')}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Người liên hệ / Chức vụ:</div>
                        <div class="font-bold text-slate-800">${vaEsc(v.contact_person || '—')} ${v.contact_title ? '(' + vaEsc(v.contact_title) + ')' : ''}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Điện thoại liên hệ:</div>
                        <div class="font-mono font-bold text-teal-800">${vaEsc(v.contact_phone || v.phone || '—')}</div>
                    </div>
                    <div>
                        <div class="text-slate-400 font-semibold mb-0.5">Email nhận lệnh & HĐĐT:</div>
                        <div class="text-slate-800">${vaEsc(v.contact_email || v.company_email || '—')}</div>
                    </div>
                </div>
            </div>

            <!-- 3. TÀI KHOẢN & BẢO MẬT CỔNG NHÀ XE (USER | PASS | TOKEN) -->
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <i class="ph ph-shield-check text-teal-700 text-sm"></i>
                            <span>Tài khoản & Bảo mật Cổng Nhà Xe (User | Pass | Token)</span>
                        </h4>
                        ${stBadge}
                    </div>
                    <div class="flex items-center gap-1.5">
                        ${hasAcct ? `
                            <button type="button" class="${VA_BTN_TEAL}" onclick="vaIssueTokenModal(${v.id})" title="Sinh mã token GSS- 12 ký tự ngẫu nhiên hoặc cấu hình hạn dùng"><i class="ph ph-key"></i> Đặt / Cấp Token</button>
                            <button type="button" class="${VA_BTN_AMBER}" onclick="vaAccountModal(${v.id})" title="Cấu hình User, đổi mật khẩu, thời gian tự đăng xuất"><i class="ph ph-pencil-simple"></i> Cấu hình User & Pass</button>
                        ` : `
                            <button type="button" class="${VA_BTN_TEAL}" onclick="vaAccountModal(${v.id})" title="Cấp tài khoản mới"><i class="ph ph-user-plus"></i> Cấp tài khoản mới</button>
                        `}
                    </div>
                </div>

                ${hasAcct ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div class="text-slate-500 font-semibold mb-1">Tên đăng nhập (User):</div>
                            <div class="font-mono font-black text-sm text-teal-900">${vaEsc(a.username)}</div>
                            <div class="text-[11px] text-slate-500 mt-1">Tự đăng xuất sau: <strong>${a.idle_timeout_minutes} phút</strong></div>
                        </div>

                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div class="text-slate-500 font-semibold mb-1">Mật khẩu (Pass):</div>
                            <div class="font-mono font-bold text-slate-700">••••••••••••</div>
                            <div class="text-[11px] text-slate-500 mt-1">Đăng nhập gần nhất: <strong>${a.last_login_at ? vaFmt(a.last_login_at) : 'Chưa đăng nhập'}</strong></div>
                        </div>

                        <div class="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                            <div class="text-teal-900 font-semibold mb-1 flex items-center justify-between">
                                <span>Mã Token xác nhận:</span>
                                <span class="text-[11px] font-bold text-teal-700">${a.token_expired ? '<span class="text-rose-700">Đã hết hạn</span>' : (a.token_expires_at ? 'Có thời hạn' : 'Vô thời hạn')}</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-1">
                                <span id="va-tok-detail-txt" class="font-mono font-bold text-xs text-slate-900">••••••••••••</span>
                                <button type="button" class="text-slate-400 hover:text-teal-700 p-1 rounded" onclick="
                                    const t = document.getElementById('va-tok-detail-txt');
                                    const ico = document.getElementById('va-tok-detail-eye');
                                    if (t.textContent === '••••••••••••') { t.textContent = '${vaEsc(a.plain_token || a.token_preview)}'; ico.className = 'ph ph-eye-slash text-sm'; }
                                    else { t.textContent = '••••••••••••'; ico.className = 'ph ph-eye text-sm'; }
                                " title="Hiện/ẩn Token"><i id="va-tok-detail-eye" class="ph ph-eye text-sm"></i></button>
                                <button type="button" class="text-slate-400 hover:text-teal-700 p-1 rounded" onclick="vaCopy('${vaEsc(a.plain_token)}', 'Đã sao chép mã Token.')" title="Sao chép Token"><i class="ph ph-copy text-sm"></i></button>
                                <button type="button" class="text-teal-700 hover:text-teal-900 bg-white border border-teal-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1" onclick="vaCopy('${vaEsc(a.magic_link)}', 'Đã sao chép Magic Link 1-chạm.')" title="Sao chép link đăng nhập tự điền"><i class="ph ph-link"></i> Magic Link</button>
                            </div>
                            <div class="text-[11px] text-slate-600 mt-1.5">Hạn dùng: <strong>${vaEsc(expText)}</strong></div>
                        </div>
                    </div>
                ` : `
                    <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between">
                        <div>
                            <div class="font-bold">Nhà xe này chưa được cấp tài khoản Cổng Đối Tác.</div>
                            <div class="text-xs text-amber-800 mt-0.5">Bấm nút "Cấp tài khoản mới" để tạo Tên đăng nhập, mật khẩu và sinh mã Token bảo mật cao.</div>
                        </div>
                        <button type="button" class="h-9 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs" onclick="vaAccountModal(${v.id})">
                            <i class="ph ph-user-plus"></i>
                            <span>Cấp tài khoản ngay</span>
                        </button>
                    </div>
                `}
            </div>

            <!-- 4. ĐỘI XE & TÀI XẾ CỦA NHÀ XE -->
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <i class="ph ph-truck text-teal-700 text-sm"></i>
                        <span>Đội Xe & Danh sách Bác tài (${drivers.length} tài xế)</span>
                    </h4>
                </div>
                <div class="mb-3">
                    <div class="text-slate-500 font-semibold mb-1">Phương tiện đầu kéo / rơ-moóc đã hoạt động:</div>
                    <div class="flex items-center gap-1.5 flex-wrap">${vehHtml}</div>
                </div>
                <div>
                    <div class="text-slate-500 font-semibold mb-1.5">Danh sách Bác tài phụ trách:</div>
                    ${drvHtml}
                </div>
            </div>

            <!-- 5. LỆNH ĐIỀU ĐỘNG & PHIẾU CHIA CONT -->
            <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <i class="ph ph-receipt text-teal-700 text-sm"></i>
                        <span>Lệnh điều động & Phiếu chia cont (${allocs.length} lệnh)</span>
                    </h4>
                </div>
                ${allocHtml}
            </div>
        </div>
    `;

    vaOpenModal(`Chi tiết Nhà Xe: ${v.short_name || v.name}`, bodyHtml, null, null, { wide: true });
}

function vaQuickOpenDriverForVendor(vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    if (!v) return;
    const dLinks = (vaData && vaData.driver_links || []).filter(d => d.vendor_id === vendorId);
    if (!dLinks.length) {
        showToast('warning', `Nhà xe ${v.short_name || v.name} hiện chưa có chuyến xe nào đang hoạt động.`);
        return;
    }
    // Mở chuyến xe gần nhất
    const latest = dLinks[0];
    vaOpenDriverScreenDirect(latest.link, latest.trip_code);
}

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

// =============================================================
// MỞ GIAO DIỆN VENDOR & TÀI XẾ (XEM & HƯỚNG DẪN / THAO TÁC HỘ)
// =============================================================

function vaOpenDriverScreenDirect(url, tripCode, mode = 'popup') {
    if (!url) {
        if (typeof showToast === 'function') showToast('warning', 'Không tìm thấy liên kết cho tài xế của chuyến này.');
        return null;
    }
    if (mode === 'tab') {
        return window.open(url, '_blank');
    }
    // Mở popup mô phỏng kích thước điện thoại di động (440x880) để Điều vận thao tác hoặc hướng dẫn chuẩn theo màn hình bác tài
    const w = 440;
    const h = 880;
    const left = Math.max(0, Math.floor((window.screen.width - w) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - h) / 2));
    const win = window.open(url, `DriverMobile_${(tripCode || 'Trip').replace(/[^a-zA-Z0-9_]/g, '_')}`, `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`);
    if (win) {
        if (typeof showToast === 'function') showToast('info', `Đang mở giao diện điện thoại của Bác tài (${tripCode || 'Chuyến'}).`);
    } else {
        window.open(url, '_blank');
    }
    return win;
}

function vaOpenVendorScreenByVendorId(vendorId) {
    if (!vaData || !vaData.vendors) {
        window.open('/vendor/', '_blank');
        return;
    }
    const v = vaData.vendors.find(x => x.id === vendorId);
    if (!v) {
        window.open('/vendor/', '_blank');
        return;
    }
    // 1. Ưu tiên Magic Link tự điền Tên đăng nhập và Token
    if (v.account && v.account.magic_link) {
        window.open(v.account.magic_link, '_blank');
        if (typeof showToast === 'function') showToast('success', `Đang mở Cổng Nhà Xe ${v.short_name} (đã điền sẵn tài khoản & token).`);
        return;
    }
    // 2. Nếu có link chia cont hiệu lực
    const alloc = (vaData.links || []).find(x => x.subcontractor_id === vendorId && x.link);
    if (alloc && alloc.link) {
        window.open(alloc.link, '_blank');
        if (typeof showToast === 'function') showToast('success', `Đang mở Phiếu chia cont ${alloc.booking_code} của ${v.short_name}.`);
        return;
    }
    // 3. Mở Cổng chung với tham số tài khoản
    if (v.account && v.account.username) {
        window.open(`/vendor/login/?u=${encodeURIComponent(v.account.username)}`, '_blank');
        if (typeof showToast === 'function') showToast('info', `Đang mở Cổng Nhà Xe ${v.short_name}.`);
        return;
    }
    // 4. Mở /vendor/ chung
    window.open('/vendor/', '_blank');
    if (typeof showToast === 'function') showToast('info', `Nhà xe ${v.short_name} chưa có tài khoản. Đang mở Cổng Nhà Xe chung /vendor/.`);
}

function vaQuickOpenVendorScreen() {
    if (!vaData) {
        window.open('/vendor/', '_blank');
        return;
    }
    const sel = document.getElementById('va-filter-vendor');
    const selectedVendorId = sel && sel.value ? parseInt(sel.value) : null;
    if (selectedVendorId) {
        vaOpenVendorScreenByVendorId(selectedVendorId);
        return;
    }
    vaOpenVendorChooserModal();
}

function vaRenderVendorChooserRows(vendors) {
    if (!vendors || !vendors.length) {
        return '<div class="p-6 text-center text-slate-400">Không tìm thấy nhà xe nào.</div>';
    }
    return vendors.map(v => {
        const a = v.account;
        const hasAcct = a && a.is_active;
        const plainTok = a && a.plain_token ? a.plain_token : '';
        const magic = a && a.magic_link ? a.magic_link : '';
        return `
            <div class="p-3 flex items-center justify-between gap-3 hover:bg-teal-50/40 transition-colors va-vendor-chooser-item" data-search="${vaEsc((v.short_name + ' ' + v.name + ' ' + (v.code || '')).toLowerCase())}">
                <div class="min-w-0 flex-1">
                    <div class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>${vaEsc(v.short_name)}</span>
                        ${v.code ? `<span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">(${vaEsc(v.code)})</span>` : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        ${hasAcct ? `<span class="text-emerald-700 font-semibold flex items-center gap-1"><i class="ph ph-check-circle text-xs"></i> Tài khoản: <b class="font-mono">${vaEsc(a.username)}</b></span>` : '<span class="text-amber-700 font-medium">Chưa cấp tài khoản</span>'}
                        <span>·</span>
                        <span>${v.links_valid} link hiệu lực</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" class="${VA_BTN_TEAL} h-8 px-2.5" onclick="vaOpenVendorScreenByVendorId(${v.id})" title="Mở trực tiếp Cổng Nhà Xe để xem và thao tác hộ">
                        <i class="ph ph-arrow-square-out"></i> Mở Màn hình Vendor
                    </button>
                    ${magic ? `<button type="button" class="${VA_BTN_GRAY} h-8 px-2" onclick="vaCopy('${vaEsc(magic)}', 'Đã sao chép Magic Link.')" title="Sao chép Magic Link"><i class="ph ph-link"></i></button>` : ''}
                </div>
            </div>`;
    }).join('');
}

function vaFilterVendorChooserModal(query) {
    const q = (query || '').trim().toLowerCase();
    const items = document.querySelectorAll('.va-vendor-chooser-item');
    items.forEach(el => {
        const text = el.getAttribute('data-search') || '';
        el.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
    });
}

function vaOpenVendorChooserModal() {
    if (!vaData || !vaData.vendors) {
        window.open('/vendor/', '_blank');
        return;
    }
    const vendors = vaData.vendors || [];
    const body = `
        <div class="space-y-3.5 text-xs">
            <div class="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 flex items-start gap-2.5">
                <i class="ph ph-desktop text-xl text-teal-700 shrink-0 mt-0.5"></i>
                <div class="leading-relaxed">
                    <strong class="font-bold">Màn hình Cổng Nhà Xe Đối Tác (Vendor Portal):</strong>
                    Mở giao diện làm việc trực tiếp của nhà xe để xem đúng thông tin đối tác nhìn thấy, hướng dẫn thao tác hoặc khai báo / gán xe / đổi tài xế hộ đối tác.
                </div>
            </div>

            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                    <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5"><i class="ph ph-globe text-teal-700"></i> Cổng Nhà Xe Chung (/vendor/)</div>
                    <div class="text-[11px] text-slate-500">Trang chủ đối tác, tự nhập mã Token hoặc mã phiếu chia cont</div>
                </div>
                <button type="button" class="${VA_BTN_TEAL} h-8 px-3 shrink-0" onclick="window.open('/vendor/', '_blank')">
                    <i class="ph ph-arrow-square-out"></i> Mở /vendor/
                </button>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Tìm kiếm Nhà xe cần xem hoặc thao tác hộ:</label>
                <div class="relative">
                    <input id="va-vendor-modal-search" type="text" placeholder="Tìm tên nhà xe, mã nhà xe..." oninput="vaFilterVendorChooserModal(this.value)" class="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-teal-600 outline-none">
                    <i class="ph ph-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-sm"></i>
                </div>
            </div>

            <div id="va-vendor-chooser-list" class="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                ${vaRenderVendorChooserRows(vendors)}
            </div>
        </div>`;

    vaOpenModal('Màn hình Vendor - Xem & Hướng dẫn / Thao tác hộ', body, null, null, { wide: true });
}

function vaQuickOpenDriverScreen() {
    if (!vaData || !vaData.driver_links) {
        if (typeof showToast === 'function') showToast('warning', 'Chưa tải được dữ liệu link tài xế.');
        return;
    }
    vaOpenDriverChooserModal();
}

function vaRenderDriverChooserRows(trips) {
    if (!trips || !trips.length) {
        return '<div class="p-8 text-center text-slate-400 font-medium">Chưa có chuyến xe nào của nhà xe đang chạy.</div>';
    }
    return trips.map(d => {
        const isValid = d.state === 'valid';
        const stCls = isValid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200';
        const stText = isValid ? 'Hiệu lực' : 'Hết hạn';
        const searchStr = `${d.trip_code} ${d.container_number} ${d.driver_name} ${d.driver_phone} ${d.plate} ${d.vendor} ${d.step_label}`.toLowerCase();
        return `
            <div class="p-3 flex items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors va-driver-chooser-item" data-search="${vaEsc(searchStr)}" data-valid="${isValid ? '1' : '0'}">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-bold text-indigo-950 text-xs">${vaEsc(d.trip_code)}</span>
                        ${d.container_number ? `<span class="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">${vaEsc(d.container_number)}</span>` : '<span class="text-slate-400 text-[11px]">(chưa có cont)</span>'}
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${stCls}">${stText}</span>
                    </div>
                    <div class="text-[11px] text-slate-700 mt-1 flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-slate-900"><i class="ph ph-user text-xs"></i> ${vaEsc(d.driver_name || 'Chưa gán tài')}</span>
                        ${d.driver_phone ? `<span class="font-mono text-slate-600">${vaEsc(d.driver_phone)}</span>` : ''}
                        ${d.plate ? `<span class="font-mono text-slate-600 bg-slate-50 px-1 rounded border border-slate-200">Xe: ${vaEsc(d.plate)}</span>` : ''}
                        <span class="text-slate-500">· Nhà xe: <b>${vaEsc(d.vendor)}</b></span>
                    </div>
                    <div class="text-[11px] text-teal-800 font-semibold mt-0.5 flex items-center gap-1">
                        <i class="ph ph-navigation-arrow text-xs"></i> Bước: ${vaEsc(d.step_label || d.step_status)}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button type="button" class="${VA_BTN_TEAL} h-8 px-2.5" ${isValid ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaOpenDriverScreenDirect('${vaEsc(d.link)}', '${vaEsc(d.trip_code)}', 'popup')" title="Mở dạng cửa sổ điện thoại di động (440x880) để thao tác hoặc hướng dẫn chuẩn">
                        <i class="ph ph-device-mobile"></i> Màn hình Mobile
                    </button>
                    <button type="button" class="${VA_BTN_GRAY} h-8 px-2" ${isValid ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaOpenDriverScreenDirect('${vaEsc(d.link)}', '${vaEsc(d.trip_code)}', 'tab')" title="Mở trong tab mới">
                        <i class="ph ph-arrow-square-out"></i>
                    </button>
                    <button type="button" class="${VA_BTN_GRAY} h-8 px-2" ${isValid ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaCopy('${vaEsc(d.link)}', 'Đã sao chép link tài xế.')" title="Sao chép link">
                        <i class="ph ph-copy"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function vaFilterDriverChooserModal(query) {
    const q = (query || '').trim().toLowerCase();
    const chk = document.getElementById('va-driver-modal-valid-only');
    const validOnly = chk ? chk.checked : true;
    const items = document.querySelectorAll('.va-driver-chooser-item');
    items.forEach(el => {
        const text = el.getAttribute('data-search') || '';
        const isValid = el.getAttribute('data-valid') === '1';
        const matchSearch = !q || text.includes(q);
        const matchValid = !validOnly || isValid;
        el.style.display = (matchSearch && matchValid) ? 'flex' : 'none';
    });
}

function vaOpenDriverChooserModal() {
    const trips = (vaData && vaData.driver_links) || [];
    const validCount = trips.filter(d => d.state === 'valid').length;

    const body = `
        <div class="space-y-3.5 text-xs">
            <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 flex items-start gap-2.5">
                <i class="ph ph-device-mobile text-xl text-indigo-700 shrink-0 mt-0.5"></i>
                <div class="leading-relaxed">
                    <strong class="font-bold">Màn hình Tài xế (Lệnh Điều Xe Di Động - /q/&lt;token&gt;/):</strong>
                    Mở giao diện điện thoại của Bác tài để Điều vận trực tiếp xem tiến độ, hướng dẫn tài xế từng bước hoặc thao tác bấm nhận hàng, giao hàng, hạ rỗng, chụp ảnh EIR/POD hộ khi tài xế gặp khó khăn.
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Tìm chuyến xe / bác tài cần xem hoặc thao tác hộ:</label>
                <div class="relative">
                    <input id="va-driver-modal-search" type="text" placeholder="Tìm số cont, số xe, tên bác tài, SĐT, số chuyến, nhà xe..." oninput="vaFilterDriverChooserModal(this.value)" class="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-indigo-600 outline-none">
                    <i class="ph ph-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-sm"></i>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Đang có <strong>${validCount}</strong> link tài xế đang hoạt động</span>
                    <label class="inline-flex items-center gap-1 cursor-pointer font-medium">
                        <input type="checkbox" id="va-driver-modal-valid-only" checked onchange="vaFilterDriverChooserModal(document.getElementById('va-driver-modal-search').value)"> Chỉ hiện link còn hiệu lực
                    </label>
                </div>
            </div>

            <div id="va-driver-chooser-list" class="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                ${vaRenderDriverChooserRows(trips)}
            </div>
        </div>`;

    vaOpenModal('Màn hình Tài xế - Xem & Hướng dẫn / Thao tác hộ', body, null, null, { wide: true });
}

window.vaShareDriverZalo = vaShareDriverZalo;
window.vaOpenDriverScreenDirect = vaOpenDriverScreenDirect;
window.vaOpenVendorScreenByVendorId = vaOpenVendorScreenByVendorId;
window.vaQuickOpenVendorScreen = vaQuickOpenVendorScreen;
window.vaOpenVendorChooserModal = vaOpenVendorChooserModal;
window.vaRenderVendorChooserRows = vaRenderVendorChooserRows;
window.vaFilterVendorChooserModal = vaFilterVendorChooserModal;
window.vaQuickOpenDriverScreen = vaQuickOpenDriverScreen;
window.vaOpenDriverChooserModal = vaOpenDriverChooserModal;
window.vaRenderDriverChooserRows = vaRenderDriverChooserRows;
window.vaFilterDriverChooserModal = vaFilterDriverChooserModal;

window.openVendorDetailPage = openVendorDetailPage;
window.backToVendorAdmin = backToVendorAdmin;
window.vaOpenVendorDetailModal = openVendorDetailPage;
window.vaToggleLockAccount = vaToggleLockAccount;
window.vaQuickOpenDriverForVendor = vaQuickOpenDriverForVendor;


// =============================================================

function vaMaskToken(tok) {
    if (!tok) return '••••••••••••';
    if (tok.startsWith('GSS-') && tok.length > 8) {
        return 'GSS-••••••••' + tok.slice(-4);
    }
    return '••••••••••••';
}
window.vaMaskToken = vaMaskToken;

// TRANG CHI TIẾT NHÀ XE & CỔNG ĐỐI TÁC (FULL-PAGE VIEW)
// =============================================================

// currentActiveVendorId declared at top


// 7 MỐC HÀNH TRÌNH CHUẨN GSS TMS (BỎ SỐ THỨ TỰ, GỌN ĐẸP HÀI HÒA)
function vaRender7StepJourney(stepStatus, timestamps) {
    const STEPS = [
        { key: 'READY', label: 'Sẵn sàng', timeKey: 'ready' },
        { key: 'ARRIVED_AT_PICKUP', label: 'Đến nhận', timeKey: 'arrived_pickup' },
        { key: 'LOADED_ON_VEHICLE', label: 'Nhận cont', timeKey: 'loaded' },
        { key: 'ARRIVED_AT_DELIVERY', label: 'Đến giao', timeKey: 'arrived_delivery' },
        { key: 'UNLOADED', label: 'Giao xong', timeKey: 'unloaded' },
        { key: 'RETURNING_EMPTY', label: 'Đi hạ rỗng', timeKey: 'empty_returning' },
        { key: 'EMPTY_RETURNED', label: 'Hạ rỗng', timeKey: 'empty_returned' },
    ];

    if (stepStatus === 'CANCELLED') {
        return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Đã hủy chuyến</span>';
    }

    const keyIndexMap = {
        'READY': 0, 'DRAFT': 0, 'ASSIGNED': 0,
        'ARRIVED_AT_PICKUP': 1, 'ACCEPTED': 1,
        'LOADED_ON_VEHICLE': 2, 'CONTAINER_PICKED': 2, 'IN_TRANSIT': 2, 'TRANSIT': 2,
        'ARRIVED_AT_DELIVERY': 3, 'AT_WAREHOUSE': 3,
        'UNLOADED': 4, 'DELIVERED': 4,
        'RETURNING_EMPTY': 5, 'EMPTY_RETURNING': 5,
        'EMPTY_RETURNED': 6, 'COMPLETED': 6
    };

    const currentIdx = keyIndexMap[stepStatus] !== undefined ? keyIndexMap[stepStatus] : 0;
    const isFinished = stepStatus === 'EMPTY_RETURNED';

    return `
        <div class="flex items-center justify-center gap-0.5 select-none py-1">
            ${STEPS.map((s, idx) => {
                const isPassed = isFinished || idx < currentIdx;
                const isCurrent = !isFinished && idx === currentIdx;
                const timeVal = timestamps && timestamps[s.timeKey] ? vaFmt(timestamps[s.timeKey]) : '';
                const tooltip = `${s.label}${timeVal ? ' (' + timeVal + ')' : ''}`;

                let btnCls;
                let dotOrIcon;
                if (isPassed) {
                    btnCls = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold';
                    dotOrIcon = '<i class="ph-bold ph-check text-[10px]"></i>';
                } else if (isCurrent) {
                    btnCls = 'bg-teal-700 text-white border-teal-700 ring-2 ring-teal-400 font-bold shadow-xs';
                    dotOrIcon = '<span class="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse"></span>';
                } else {
                    btnCls = 'bg-slate-50 text-slate-500 border-slate-200 font-medium hover:bg-slate-100/70';
                    dotOrIcon = '';
                }

                const connector = idx < STEPS.length - 1 ? `
                    <div class="w-2 sm:w-2.5 h-[2px] ${isPassed ? 'bg-emerald-500' : 'bg-slate-200'} shrink-0"></div>
                ` : '';

                return `
                    <div class="flex items-center">
                        <button type="button" class="h-6 px-2 rounded-lg border text-[11px] inline-flex items-center gap-1 transition-all cursor-default ${btnCls}"
                            title="${tooltip}">
                            ${dotOrIcon}
                            <span class="whitespace-nowrap">${s.label}</span>
                        </button>
                        ${connector}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
window.vaRender7StepJourney = vaRender7StepJourney;

async function openVendorDetailPage(vendorId, updateHistory = true) {
    currentActiveVendorId = vendorId;
    
    // Đảm bảo dữ liệu vendor-admin đã được tải
    if (!vaData || !vaData.vendors || !vaData.vendors.length) {
        try {
            await loadVendorAdminTab(false);
        } catch (e) {
            console.error('Lỗi khi tải dữ liệu vendor:', e);
        }
    }

    const v = (vaData && vaData.vendors || []).find(x => String(x.id) === String(vendorId) || String(x.code) === String(vendorId));
    if (!v) {
        if (typeof showToast === 'function') showToast('error', 'Không tìm thấy thông tin nhà xe được yêu cầu.');
        return;
    }

    // 1. Cập nhật Semantic URL: /dispatch/vendors/<id>
    if (updateHistory && window.history && window.history.pushState) {
        const vPath = `/dispatch/vendors/${v.id}`;
        if (window.location.pathname !== vPath) {
            window.history.pushState({ view: 'vendor-detail', vendorId: v.id }, '', vPath);
        }
    }

    // 2. Ẩn tất cả view khác, kích hoạt view-vendor-detail
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden-view'));
    const detailView = document.getElementById('view-vendor-detail');
    if (detailView) {
        detailView.classList.remove('hidden-view');
    }

    // 3. Chuẩn bị dữ liệu tài khoản, lái xe, phương tiện, lệnh điều vận
    const a = v.account;
    const isLocked = a && (a.locked || !a.is_active);
    const hasAccount = !!a;
    const drivers = v.drivers || [];
    const vehicles = v.vehicles || [];
    const allocs = (vaData && vaData.links || []).filter(l => l.subcontractor_id === v.id);

    // Gán thông tin Header Topbar
    const setText = (id, val, defaultVal = '--') => {
        const el = document.getElementById(id);
        if (el) el.innerText = (val !== undefined && val !== null && val !== '') ? val : defaultVal;
    };

    setText('vd-header-code', v.code || '3PL');
    setText('vd-header-name', v.short_name || v.name);
    setText('vd-header-tax', v.tax_code);
    setText('vd-header-contact', v.contact_person);
    setText('vd-header-phone', v.contact_phone || v.phone);
    setText('vd-header-address', v.yard_address || v.address);

    // Badge trạng thái Header
    const stBadge = document.getElementById('vd-header-status-badge');
    if (stBadge) {
        if (!hasAccount) {
            stBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-amber-50 text-amber-800 border-amber-200';
            stBadge.innerText = 'Chưa cấp tài khoản';
        } else if (isLocked) {
            stBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-rose-50 text-rose-800 border-rose-200';
            stBadge.innerText = 'Đang bị khóa';
        } else {
            stBadge.className = 'px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading whitespace-nowrap bg-emerald-50 text-emerald-800 border-emerald-200';
            stBadge.innerText = 'Đang hoạt động';
        }
    }

    // Nút Quick Actions trên Topbar
    const btnOpenVendor = document.getElementById('vd-btn-open-vendor');
    if (btnOpenVendor) {
        btnOpenVendor.onclick = () => vaOpenVendorScreenByVendorId(v.id);
    }
    const btnOpenDriver = document.getElementById('vd-btn-open-driver');
    if (btnOpenDriver) {
        btnOpenDriver.onclick = () => vaQuickOpenDriverForVendor(v.id);
    }
    const btnShareZalo = document.getElementById('vd-btn-share-zalo');
    if (btnShareZalo) {
        btnShareZalo.onclick = () => vaShareVendorZaloModal(v.id);
    }
    const btnToggleLock = document.getElementById('vd-btn-toggle-lock');
    const lblLock = document.getElementById('vd-lock-btn-label');
    if (btnToggleLock) {
        if (!hasAccount) {
            btnToggleLock.disabled = true;
            btnToggleLock.classList.add('opacity-40', 'cursor-not-allowed');
            if (lblLock) lblLock.innerText = 'Chưa có tài khoản';
        } else {
            btnToggleLock.disabled = false;
            btnToggleLock.classList.remove('opacity-40', 'cursor-not-allowed');
            btnToggleLock.onclick = async () => {
                await vaToggleLockAccount(v.id, !isLocked);
                openVendorDetailPage(v.id, false);
            };
            if (lblLock) lblLock.innerText = isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
        }
    }

    // THẺ 1: Thông tin pháp lý & liên hệ
    setText('vd-company-name', v.name);
    setText('vd-short-name', v.short_name);
    setText('vd-tax-code', v.tax_code);
    setText('vd-yard-address', v.yard_address);
    setText('vd-office-address', v.address);
    setText('vd-contact-person', v.contact_person);
    setText('vd-contact-title', v.contact_title ? `Chức vụ: ${v.contact_title}` : '');
    setText('vd-contact-phone', v.contact_phone || v.phone);
    setText('vd-company-email', v.company_email);

    // THẺ 2: Tài khoản & Bảo mật Cổng Nhà xe
    const btnIssueToken = document.getElementById('vd-btn-issue-token');
    if (btnIssueToken) {
        btnIssueToken.onclick = () => vaIssueTokenModal(v.id);
    }
    const btnConfigAccount = document.getElementById('vd-btn-config-account');
    if (btnConfigAccount) {
        btnConfigAccount.onclick = () => vaAccountModal(v.id);
    }

    const acctContent = document.getElementById('vd-account-content');
    if (acctContent) {
        if (hasAccount) {
            const expText = a.token_expires_at
                ? (a.token_expired ? `Đã hết hạn (${vaFmt(a.token_expires_at)})` : `Hiệu lực đến ${vaFmt(a.token_expires_at)}`)
                : 'Vô thời hạn (Không hết hạn)';
            acctContent.innerHTML = `
                <div class="space-y-3">
                    <!-- HÀNG 1: Tên đăng nhập | Mật khẩu -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="bg-slate-50/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div class="text-slate-500 font-semibold text-xs mb-1">Tên đăng nhập (User):</div>
                            <div class="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
                                <span>${vaEsc(a.username)}</span>
                                <button type="button" class="text-slate-400 hover:text-teal-700 p-1 cursor-pointer" onclick="vaCopy('${vaEsc(a.username)}', 'Đã sao chép Username.')" title="Sao chép"><i class="ph-bold ph-copy"></i></button>
                            </div>
                            <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><i class="ph-bold ph-clock"></i> Tự đăng xuất sau: <b>${a.idle_timeout_minutes || 15} phút</b></div>
                        </div>

                        <div class="bg-slate-50/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div class="text-slate-500 font-semibold text-xs mb-1">Mật khẩu (Pass):</div>
                            <div class="font-mono font-bold text-slate-700 text-sm tracking-widest flex items-center justify-between">
                                <span>••••••••••••</span>
                                <span class="text-[10px] text-teal-800 font-sans font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">Bảo mật</span>
                            </div>
                            <div class="text-[11px] text-slate-500 mt-1">Đăng nhập gần nhất: <b>${a.last_login_at ? vaFmt(a.last_login_at) : 'Chưa đăng nhập'}</b></div>
                        </div>
                    </div>

                    <!-- HÀNG 2: Email | Số điện thoại -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="bg-slate-50/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div class="text-slate-500 font-semibold text-xs mb-1">Email nhận lệnh &amp; OTP:</div>
                            <div class="font-mono font-semibold text-slate-800 text-xs flex items-center justify-between truncate">
                                <span class="truncate" title="${vaEsc(v.company_email || v.contact_email || 'Chưa cấu hình')}">${vaEsc(v.company_email || v.contact_email || 'Chưa cấu hình')}</span>
                                ${(v.company_email || v.contact_email) ? `<button type="button" class="text-slate-400 hover:text-teal-700 p-1 shrink-0 cursor-pointer" onclick="vaCopy('${vaEsc(v.company_email || v.contact_email)}', 'Đã sao chép Email.')" title="Sao chép Email"><i class="ph-bold ph-copy"></i></button>` : ''}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Hòm thư nhận phiếu điều động &amp; hóa đơn</div>
                        </div>

                        <div class="bg-slate-50/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div class="text-slate-500 font-semibold text-xs mb-1">Số điện thoại liên hệ / Zalo:</div>
                            <div class="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
                                <span>${vaEsc(v.contact_phone || v.phone || 'Chưa cấu hình')}</span>
                                ${(v.contact_phone || v.phone) ? `<button type="button" class="text-slate-400 hover:text-teal-700 p-1 cursor-pointer" onclick="vaCopy('${vaEsc(v.contact_phone || v.phone)}', 'Đã sao chép SĐT.')" title="Sao chép SĐT"><i class="ph-bold ph-copy"></i></button>` : ''}
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Đường dây nóng trao đổi với Điều vận GSS</div>
                        </div>
                    </div>

                    <!-- HÀNG 3: Mã Token xác nhận GSS- [12 ký tự ngẫu nhiên] -->
                    <div class="bg-teal-50/60 p-3.5 rounded-xl border border-teal-200 shadow-2xs">
                        <div class="text-teal-950 font-bold text-xs mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span class="flex items-center gap-1.5 font-heading">
                                <i class="ph-bold ph-key text-teal-700 text-sm"></i>
                                <span>Mã Token xác nhận (GSS- 12 số &amp; ký tự):</span>
                            </span>
                            <div class="flex items-center gap-2">
                                <span class="text-[10.5px] font-bold px-2 py-0.5 rounded-full ${a.token_expired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                                    ${a.token_expired ? 'Hết hạn' : 'Hợp lệ'}
                                </span>
                                <span class="text-[11px] text-slate-500">Hạn dùng: <strong>${vaEsc(expText)}</strong></span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <span id="va-tok-detail-text" class="font-mono font-bold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-teal-300 text-sm tracking-wider flex-1 truncate select-all shadow-2xs">
                                ${vaMaskToken(a.plain_token || a.token_preview)}
                            </span>
                            <button type="button" class="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" onclick="vaToggleShowTokenInDetail('${vaEsc(a.plain_token)}')" title="Hiện/ẩn Token">
                                <i id="va-tok-detail-eye" class="ph-bold ph-eye text-sm"></i>
                                <span id="va-tok-detail-eye-text">Hiện</span>
                            </button>
                            <button type="button" class="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" onclick="vaCopy('${vaEsc(a.plain_token)}', 'Đã sao chép mã Token.')" title="Sao chép mã Token">
                                <i class="ph-bold ph-copy text-sm"></i>
                                <span>Sao chép</span>
                            </button>
                            <button type="button" class="h-8 px-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-2xs text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors" onclick="vaIssueTokenModal(${v.id})" title="Đổi hoặc sinh lại mã Token ngẫu nhiên GSS-">
                                <i class="ph-bold ph-arrows-clockwise text-sm"></i>
                                <span>Đổi Token</span>
                            </button>
                        </div>
                    </div>

                    <!-- HÀNG 4: Magic Link (Đăng nhập 1-chạm) -->
                    <div class="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
                        <div class="text-indigo-950 font-bold text-xs mb-1.5 flex items-center justify-between flex-wrap gap-1">
                            <span class="flex items-center gap-1.5 font-heading">
                                <i class="ph-bold ph-link text-indigo-700 text-sm"></i>
                                <span>Đường dẫn Magic Link (Đăng nhập 1-chạm Cổng Nhà Xe):</span>
                            </span>
                            <span class="text-[11px] text-indigo-700 font-semibold">Tự động điền Username &amp; Token</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <input type="text" readonly value="${vaEsc(a.magic_link)}" class="font-mono text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 flex-1 truncate select-all shadow-2xs focus:outline-none" />
                            <button type="button" class="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-300 shadow-2xs text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors" onclick="vaCopy('${vaEsc(a.magic_link)}', 'Đã sao chép Magic Link 1-chạm.')" title="Sao chép link đăng nhập">
                                <i class="ph-bold ph-copy text-sm"></i>
                                <span>Sao chép Link</span>
                            </button>
                            <button type="button" class="h-8 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white shadow-2xs text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors" onclick="window.open('${vaEsc(a.magic_link)}', '_blank')" title="Mở thử Cổng Nhà Xe trong tab mới">
                                <i class="ph-bold ph-arrow-square-out text-sm"></i>
                                <span>Mở Cổng</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            acctContent.innerHTML = `
                <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <div class="font-bold text-sm">Nhà xe này chưa được cấp tài khoản Cổng Đối Tác.</div>
                        <div class="text-xs text-amber-800 mt-0.5">Bấm nút "Cấp tài khoản ngay" để tạo Tên đăng nhập, mật khẩu và sinh mã Token bảo mật cao GSS-[12 ký tự].</div>
                    </div>
                    <button type="button" class="h-9 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs" onclick="vaAccountModal(${v.id})">
                        <i class="ph-bold ph-user-plus"></i>
                        <span>Cấp tài khoản ngay</span>
                    </button>
                </div>
            `;
        }
    }

    // HÀNG 2 - PHẦN 1: Danh sách Đội xe & Phương tiện (Mỗi xe 1 dòng)
    const vehStatBadge = document.getElementById('vd-vehicles-stat-badge');
    if (vehStatBadge) {
        vehStatBadge.innerText = `${vehicles.length} Phương tiện`;
    }

    const vehBody = document.getElementById('vd-vehicles-table-body');
    if (vehBody) {
        if (vehicles.length) {
            vehBody.innerHTML = vehicles.map(vItem => {
                const plate = typeof vItem === 'object' ? (vItem.plate || '') : vItem;
                const vType = typeof vItem === 'object' ? (vItem.vehicle_type || 'Đầu kéo Container') : 'Đầu kéo Container';
                const brand = typeof vItem === 'object' ? (vItem.brand || '') : '';
                const dName = typeof vItem === 'object' ? (vItem.driver_name || '') : '';
                const dPhone = typeof vItem === 'object' ? (vItem.driver_phone || '') : '';
                const tCode = typeof vItem === 'object' ? (vItem.latest_trip_code || '') : '';
                const status = typeof vItem === 'object' ? (vItem.status || 'Sẵn sàng') : 'Sẵn sàng';
                const tripsCount = typeof vItem === 'object' ? (vItem.trips_count || 0) : 0;
                const payload = typeof vItem === 'object' ? (vItem.payload || '') : '';

                let stCls = 'bg-slate-100 text-slate-600 border-slate-200';
                if (status.includes('chạy') || status.includes('ACTIVE')) {
                    stCls = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                } else if (status.includes('Sẵn sàng') || status.includes('IDLE')) {
                    stCls = 'bg-blue-50 text-blue-800 border-blue-200';
                }

                return `
                    <tr class="hover:bg-teal-50/30 transition-colors">
                        <td class="p-3">
                            <div class="flex items-center gap-2">
                                <span class="bg-slate-100 font-mono font-bold text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 text-xs inline-flex items-center gap-1.5 shadow-2xs">
                                    <i class="ph-bold ph-truck text-teal-700 text-sm"></i>
                                    <span>${vaEsc(plate)}</span>
                                </span>
                                ${brand ? `<span class="text-xs text-slate-500 font-semibold">${vaEsc(brand)}</span>` : ''}
                            </div>
                        </td>
                        <td class="p-3 text-slate-800">
                            <div class="font-semibold text-xs">${vaEsc(vType)}</div>
                            ${payload ? `<div class="text-[11px] text-slate-400 mt-0.5">Tải trọng: ${vaEsc(payload)}</div>` : ''}
                        </td>
                        <td class="p-3">
                            ${dName ? `
                                <div class="font-bold text-slate-900 text-xs">${vaEsc(dName)}</div>
                                ${dPhone ? `<div class="font-mono text-slate-500 text-[11px] mt-0.5">${vaEsc(dPhone)}</div>` : ''}
                            ` : '<span class="text-slate-400 italic text-xs">Chưa gán tài xế</span>'}
                        </td>
                        <td class="p-3">
                            ${tCode ? `
                                <div class="flex items-center gap-1.5">
                                    <button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer text-xs" onclick="viewTripDetail('${vaEsc(tCode)}')">${vaEsc(tCode)}</button>
                                    ${tripsCount > 0 ? `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">${tripsCount} chuyến</span>` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-xs">Chưa có chuyến</span>'}
                        </td>
                        <td class="p-3">
                            <span class="px-2.5 py-1 rounded-full border text-[11px] font-bold ${stCls}">${vaEsc(status)}</span>
                        </td>
                        <td class="p-3 text-center">
                            <div class="inline-flex items-center gap-1.5 justify-center">
                                <button type="button" class="${VA_BTN_TEAL} h-7 px-2.5 text-xs inline-flex items-center gap-1" onclick="vaViewVehicleDetail('${vaEsc(plate)}', ${v.id})" title="Xem hồ sơ chi tiết phương tiện">
                                    <i class="ph-bold ph-eye"></i> Xem
                                </button>
                                <button type="button" class="${VA_BTN_GRAY} h-7 px-2 text-xs inline-flex items-center gap-1" onclick="vaViewVehicleTrips('${vaEsc(plate)}', ${v.id})" title="Xem lịch sử các chuyến xe đã vận chuyển">
                                    <i class="ph-bold ph-clock-counter-clockwise"></i> Lịch sử
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            vehBody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">Chưa có phương tiện nào ghi nhận thuộc quyền quản lý của nhà xe này.</td></tr>';
        }
    }

    // HÀNG 2 - PHẦN 2: Danh sách Bác tài
    const drvStatBadge = document.getElementById('vd-drivers-stat-badge');
    if (drvStatBadge) {
        drvStatBadge.innerText = `${drivers.length} Bác tài`;
    }

    const drvBody = document.getElementById('vd-drivers-table-body');
    if (drvBody) {
        if (drivers.length) {
            drvBody.innerHTML = drivers.map(d => {
                const isValid = d.state === 'valid' || !d.state;
                const stCls = isValid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                const dName = d.driver_name || d.name || '---';
                const dPhone = d.driver_phone || d.phone || '---';
                const tCode = d.trip_code || d.latest_trip_code || '';
                const vPlate = d.plate || d.latest_plate || '';
                const cNum = d.container_number || '';
                const sLabel = d.step_label || d.latest_status || 'Đang vận hành';
                const dLink = d.link || '';
                return `
                    <tr class="hover:bg-teal-50/30 transition-colors">
                        <td class="p-3">
                            <div class="font-bold text-slate-900">${vaEsc(dName)}</div>
                        </td>
                        <td class="p-3 font-mono font-semibold text-slate-700">
                            ${vaEsc(dPhone)}
                        </td>
                        <td class="p-3">
                            ${tCode ? `<button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer" onclick="viewTripDetail('${vaEsc(tCode)}')">${vaEsc(tCode)}</button>` : '<span class="text-slate-400">---</span>'}
                        </td>
                        <td class="p-3 font-mono">
                            ${vPlate ? `<span class="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold mr-1">${vaEsc(vPlate)}</span>` : ''}
                            ${cNum ? `<span class="text-slate-800 font-bold">${vaEsc(cNum)}</span>` : ''}
                        </td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded border text-[11px] font-bold ${stCls}">${vaEsc(sLabel)}</span>
                        </td>
                        <td class="p-3 text-center">
                            <div class="inline-flex items-center gap-1.5 justify-center">
                                <button type="button" class="${VA_BTN_TEAL} h-7 px-2.5 text-xs inline-flex items-center gap-1" onclick="vaViewDriverDetail('${vaEsc(dName)}', '${vaEsc(dPhone)}', ${v.id})" title="Xem hồ sơ chi tiết Bác tài">
                                    <i class="ph-bold ph-eye"></i> Xem
                                </button>
                                <button type="button" class="${VA_BTN_GRAY} h-7 px-2 text-xs inline-flex items-center gap-1" onclick="vaContactDriverDirect('${vaEsc(dPhone)}', '${vaEsc(dName)}')" title="Liên hệ Zalo / Gọi điện thoại">
                                    <i class="ph-bold ph-chat-teardrop-text"></i> Zalo / Gọi
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            drvBody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Chưa có thông tin Bác tài nào cho nhà xe này.</td></tr>';
        }
    }

    // HÀNG 3 - PHÂN KHU A: CÁC LỆNH CHƯA PHÂN BỔ XE
    const unallocated = allocs.filter(l => l.filled < l.allocated_containers);
    const unallocBadge = document.getElementById('vd-unallocated-stat-badge');
    if (unallocBadge) {
        unallocBadge.innerText = `${unallocated.length} Lệnh chưa gán đủ`;
    }

    const unallocBody = document.getElementById('vd-unallocated-table-body');
    if (unallocBody) {
        if (unallocated.length) {
            unallocBody.innerHTML = unallocated.map(l => {
                const left = l.allocated_containers - l.filled;
                const pct = l.allocated_containers ? Math.round(100 * l.filled / l.allocated_containers) : 0;
                const st = l.expired ? vaState('text-rose-700', 'ph-clock-countdown', 'Hết hạn')
                    : l.locked ? vaState('text-slate-600', 'ph-lock', 'Đã khóa')
                    : l.filled === 0 ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Chưa gán xe nào</span>'
                    : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Gán một phần</span>';
                return `
                    <tr class="hover:bg-amber-50/20 transition-colors">
                        <td class="p-3 font-mono font-bold text-teal-900">${vaEsc(l.booking_code)}</td>
                        <td class="p-3 font-mono font-bold text-slate-800">${vaEsc(l.dispatch_order_code || '---')}</td>
                        <td class="p-3 font-medium text-slate-800">${vaEsc(l.customer_name || 'Khách hàng')}</td>
                        <td class="p-3 min-w-[180px]">
                            <div class="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                                <span>${l.filled} / ${l.allocated_containers} cont</span>
                                <span class="text-amber-800 font-semibold text-[11px]">Còn thiếu ${left} cont</span>
                            </div>
                            <div class="h-1.5 rounded-full bg-slate-200 w-full overflow-hidden">
                                <div class="h-full rounded-full ${left <= 0 ? 'bg-emerald-600' : 'bg-amber-500'}" style="width:${pct}%"></div>
                            </div>
                        </td>
                        <td class="p-3">${vaExpiry(l.expires_at, l.expired)}</td>
                        <td class="p-3">${st}</td>
                        <td class="p-3 text-center">
                            <div class="inline-flex items-center gap-1.5 justify-center">
                                <button type="button" class="${VA_BTN_TEAL} h-7 px-2.5 text-xs inline-flex items-center gap-1" onclick="vaViewUnallocatedContainersModal(${l.id})" title="Xem danh sách chi tiết các container thuộc phiếu chia này">
                                    <i class="ph-bold ph-list-bullets"></i> Xem Cont
                                </button>
                                ${l.link ? `
                                    <button type="button" class="${VA_BTN_GRAY} h-7 px-2 text-xs inline-flex items-center gap-1" onclick="window.open('${vaEsc(l.link)}', '_blank')" title="Mở trực tiếp Cổng Nhà Xe của phiếu chia này để thao tác hộ">
                                        <i class="ph-bold ph-desktop"></i> Màn hình Vendor
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            unallocBody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400 font-medium">Toàn bộ các lệnh đã được phân bổ đủ xe và tài xế. Không có lệnh tồn đọng.</td></tr>';
        }
    }

    // HÀNG 3 - PHÂN KHU B: CÁC LỆNH ĐÃ PHÂN BỔ & Ô TRẠNG THÁI 7 NÚT
    const allocatedTrips = v.allocated_trips || vaData.driver_links.filter(d => String(d.vendor_id) === String(v.id));
    const allocTripsBadge = document.getElementById('vd-allocated-stat-badge');
    if (allocTripsBadge) {
        allocTripsBadge.innerText = `${allocatedTrips.length} Chuyến đã phân bổ`;
    }

    const allocTripsBody = document.getElementById('vd-allocated-table-body');
    if (allocTripsBody) {
        if (allocatedTrips.length) {
            allocTripsBody.innerHTML = allocatedTrips.map(t => {
                const routeParts = [t.pickup_place || 'Cảng nhận', t.delivery_place || 'Kho giao', t.empty_return_place || 'Depot rỗng'].filter(Boolean);
                const routeStr = routeParts.map(p => vaEsc(p)).join(' <span class="text-teal-600 font-bold mx-1">➔</span> ');
                return `
                    <tr class="hover:bg-teal-50/20 transition-colors">
                        <td class="p-3 shrink-0">
                            <div class="font-mono font-bold text-teal-900">${vaEsc(t.trip_code)}</div>
                            ${t.container_number ? `<div class="font-mono text-slate-700 text-xs mt-0.5"><span class="text-slate-400">Cont:</span> <b>${vaEsc(t.container_number)}</b></div>` : ''}
                        </td>
                        <td class="p-3 shrink-0">
                            <div class="font-bold text-slate-900 text-xs">${vaEsc(t.customer || 'Khách hàng')}</div>
                            <div class="font-mono text-slate-500 text-[11px] mt-0.5">${vaEsc(t.booking_code || '---')}</div>
                        </td>
                        <td class="p-3 shrink-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                ${t.plate ? `<span class="bg-slate-100 font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 text-xs">${vaEsc(t.plate)}</span>` : ''}
                                <span class="font-bold text-slate-800 text-xs">${vaEsc(t.driver_name || 'Bác tài')}</span>
                            </div>
                            ${t.driver_phone ? `<div class="font-mono text-slate-500 text-[11px] mt-0.5">${vaEsc(t.driver_phone)}</div>` : ''}
                        </td>
                        <td class="p-3 text-xs text-slate-800 font-medium whitespace-nowrap min-w-[440px]">
                            <div class="flex items-center gap-1 whitespace-nowrap">
                                ${routeStr}
                            </div>
                        </td>
                        <td class="p-3 text-center">
                            ${vaRender7StepJourney(t.step_status, t.timestamps)}
                        </td>
                        <td class="p-3 text-center">
                            <div class="inline-flex items-center gap-1.5 justify-center">
                                ${t.link ? `
                                    <button type="button" class="${VA_BTN_TEAL} h-7 px-2.5 text-xs" onclick="vaOpenDriverScreenDirect('${vaEsc(t.link)}', '${vaEsc(t.trip_code)}', 'popup')" title="Mở mô phỏng màn hình di động của Bác tài để theo dõi hoặc xác nhận hộ">
                                        <i class="ph-bold ph-device-mobile"></i> Màn hình Tài xế
                                    </button>
                                    <button type="button" class="${VA_BTN_GRAY} h-7 px-2 text-xs" onclick="vaCopy('${vaEsc(t.link)}', 'Đã sao chép link tài xế.')" title="Sao chép link di động">
                                        <i class="ph-bold ph-copy"></i>
                                    </button>
                                ` : '<span class="text-slate-400 italic text-xs">Không có link</span>'}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            allocTripsBody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">Chưa có chuyến xe nào được phân bổ cho nhà xe này.</td></tr>';
        }
    }
}

function backToVendorAdmin() {
    // Ẩn view-vendor-detail
    const detailView = document.getElementById('view-vendor-detail');
    if (detailView) {
        detailView.classList.add('hidden-view');
    }

    // Hiển thị view Điều Vận và chuyển sang Tab 4 (Quản lý Vendor)
    if (typeof switchTab === 'function') {
        switchTab('dieu-van', false);
    }
    if (typeof switchDispatchViewTab === 'function') {
        switchDispatchViewTab('vendor-admin');
    }

    // Cập nhật URL sạch: /dispatch
    if (window.history && window.history.pushState) {
        window.history.pushState({ view: 'dispatch', tab: 'vendor-admin' }, '', '/dispatch');
    }
}

window.openVendorDetailPage = openVendorDetailPage;
window.backToVendorAdmin = backToVendorAdmin;


function vaToggleShowTokenInDetail(plainToken) {
    const el = document.getElementById('va-tok-detail-text');
    const eye = document.getElementById('va-tok-detail-eye');
    if (!el) return;
    const isMasked = el.getAttribute('data-shown') !== '1';
    if (isMasked) {
        el.innerText = plainToken || '---';
        el.setAttribute('data-shown', '1');
        if (eye) eye.className = 'ph ph-eye-slash text-sm text-teal-700';
    } else {
        el.innerText = vaMaskToken(plainToken);
        el.setAttribute('data-shown', '0');
        if (eye) eye.className = 'ph ph-eye text-sm';
    }
}
window.vaToggleShowTokenInDetail = vaToggleShowTokenInDetail;


// ---------- HÀM HỖ TRỢ XEM CHI TIẾT XE, TÀI XẾ & LIST CONTAINER THEO LỆNH ----------

function vaViewVehicleDetail(plate, vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    const vList = (v && v.vehicles) || [];
    const item = vList.find(x => (typeof x === 'object' ? x.plate : x) === plate) || { plate };
    const plateStr = typeof item === 'object' ? (item.plate || plate) : plate;
    const vType = typeof item === 'object' ? (item.vehicle_type || 'Đầu kéo Container') : 'Đầu kéo Container';
    const brand = typeof item === 'object' ? (item.brand || '---') : '---';
    const payload = typeof item === 'object' ? (item.payload || '---') : '---';
    const dName = typeof item === 'object' ? (item.driver_name || '---') : '---';
    const dPhone = typeof item === 'object' ? (item.driver_phone || '---') : '---';
    const tCode = typeof item === 'object' ? (item.latest_trip_code || '') : '';
    const status = typeof item === 'object' ? (item.status || 'Sẵn sàng') : 'Sẵn sàng';
    const tripsCount = typeof item === 'object' ? (item.trips_count || 0) : 0;
    const vendorName = v ? (v.short_name || v.name) : 'Nhà xe';

    const body = `
        <div class="space-y-4 text-xs">
            <div class="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center text-2xl font-bold shadow-2xs">
                        <i class="ph-bold ph-truck"></i>
                    </div>
                    <div>
                        <div class="font-mono font-black text-slate-900 text-base tracking-wide">${vaEsc(plateStr)}</div>
                        <div class="font-semibold text-teal-800 text-xs">${vaEsc(vType)}</div>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-white text-teal-900 border border-teal-200 shadow-2xs">${vaEsc(status)}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Nhà xe quản lý:</div>
                    <div class="font-bold text-slate-900 text-xs">${vaEsc(vendorName)}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Hãng sản xuất / Model:</div>
                    <div class="font-bold text-slate-900 text-xs">${vaEsc(brand)}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Tải trọng cho phép:</div>
                    <div class="font-bold text-slate-900 text-xs">${vaEsc(payload)}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Tổng số chuyến vận chuyển:</div>
                    <div class="font-bold text-teal-800 text-xs font-mono">${tripsCount} chuyến</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Bác tài thường lái:</div>
                    <div class="font-bold text-slate-900 text-xs">${vaEsc(dName)}</div>
                    ${dPhone !== '---' ? `<div class="font-mono text-slate-500 text-[11px] mt-0.5">${vaEsc(dPhone)}</div>` : ''}
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Chuyến xe gần nhất:</div>
                    ${tCode ? `<button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer text-xs" onclick="vaCloseModal(); viewTripDetail('${vaEsc(tCode)}')">${vaEsc(tCode)}</button>` : '<span class="text-slate-400 italic">Chưa có chuyến</span>'}
                </div>
            </div>
        </div>
    `;

    vaOpenModal(`Hồ sơ Phương tiện: ${plateStr}`, body, null, null, { wide: true });
}

function vaViewVehicleTrips(plate, vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    const trips = ((v && v.allocated_trips) || (vaData && vaData.driver_links) || []).filter(t => (t.plate || '') === plate);
    
    let rowsHtml = '';
    if (trips.length) {
        rowsHtml = trips.map(t => `
            <tr class="hover:bg-teal-50/20">
                <td class="p-2.5 font-mono font-bold text-teal-900"><button type="button" class="hover:underline cursor-pointer" onclick="vaCloseModal(); viewTripDetail('${vaEsc(t.trip_code)}')">${vaEsc(t.trip_code)}</button></td>
                <td class="p-2.5 font-mono text-slate-800">${vaEsc(t.container_number || '---')}</td>
                <td class="p-2.5 text-slate-800 font-semibold">${vaEsc(t.customer || '---')}</td>
                <td class="p-2.5 font-medium text-slate-800">${vaEsc(t.driver_name || 'Bác tài')}</td>
                <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">${vaEsc(t.step_label || 'Đang vận hành')}</span></td>
                <td class="p-2.5 text-center">
                    <button type="button" class="${VA_BTN_TEAL} text-xs py-1" onclick="vaCloseModal(); viewTripDetail('${vaEsc(t.trip_code)}')"><i class="ph-bold ph-eye"></i> Xem</button>
                </td>
            </tr>
        `).join('');
    } else {
        rowsHtml = '<tr><td colspan="6" class="p-5 text-center text-slate-400">Chưa ghi nhận lịch sử chuyến xe nào của phương tiện này.</td></tr>';
    }

    const body = `
        <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                <div class="font-bold text-slate-800">Phương tiện: <span class="font-mono text-teal-900">${vaEsc(plate)}</span></div>
                <div class="text-xs font-semibold text-slate-500">${trips.length} chuyến xe</div>
            </div>
            <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                            <th class="p-2.5">Mã Chuyến</th>
                            <th class="p-2.5">Số Container</th>
                            <th class="p-2.5">Khách Hàng</th>
                            <th class="p-2.5">Bác Tài Lái</th>
                            <th class="p-2.5">Trạng Thái</th>
                            <th class="p-2.5 text-center">Chi Tiết</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white font-medium">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    vaOpenModal(`Lịch sử Chuyến xe: ${plate}`, body, null, null, { wide: true });
}

function vaViewDriverDetail(name, phone, vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    const dList = (v && v.drivers) || [];
    const dItem = dList.find(x => (x.driver_name || x.name) === name && (x.driver_phone || x.phone) === phone) || { name, phone };
    const dName = dItem.driver_name || dItem.name || name;
    const dPhone = dItem.driver_phone || dItem.phone || phone;
    const tCode = dItem.trip_code || dItem.latest_trip_code || '';
    const vPlate = dItem.plate || dItem.latest_plate || '';
    const status = dItem.step_label || dItem.latest_status || 'Sẵn sàng';
    const dLink = dItem.link || '';
    const vendorName = v ? (v.short_name || v.name) : 'Nhà xe';
    const cleanPhone = (dPhone || '').replace(/\D/g, '');

    const body = `
        <div class="space-y-4 text-xs">
            <div class="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center text-2xl font-bold shadow-2xs">
                        <i class="ph-bold ph-steering-wheel"></i>
                    </div>
                    <div>
                        <div class="font-bold text-slate-900 text-base">${vaEsc(dName)}</div>
                        <div class="font-mono font-semibold text-teal-800 text-xs">${vaEsc(dPhone)}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${cleanPhone ? `
                        <button type="button" class="h-8 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs" onclick="window.open('https://zalo.me/${cleanPhone}', '_blank')">
                            <i class="ph-bold ph-chat-teardrop-text"></i> Chat Zalo
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Nhà xe chủ quản:</div>
                    <div class="font-bold text-slate-900 text-xs">${vaEsc(vendorName)}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Số điện thoại liên lạc:</div>
                    <div class="font-mono font-bold text-slate-900 text-xs">${vaEsc(dPhone)}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Đầu kéo / Phương tiện gán:</div>
                    <div class="font-mono font-bold text-teal-800 text-xs">${vaEsc(vPlate || 'Chưa gán xe')}</div>
                </div>
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Trạng thái công việc:</div>
                    <div class="font-bold text-slate-800 text-xs">${vaEsc(status)}</div>
                </div>
                <div class="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="text-slate-400 font-semibold mb-0.5">Chuyến xe phụ trách gần nhất:</div>
                    ${tCode ? `
                        <div class="flex items-center justify-between mt-1">
                            <button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer text-xs" onclick="vaCloseModal(); viewTripDetail('${vaEsc(tCode)}')">${vaEsc(tCode)}</button>
                            ${dLink ? `<button type="button" class="${VA_BTN_TEAL} text-xs py-1" onclick="vaOpenDriverScreenDirect('${vaEsc(dLink)}', '${vaEsc(tCode)}', 'popup')"><i class="ph-bold ph-device-mobile"></i> Màn hình Tài xế</button>` : ''}
                        </div>
                    ` : '<span class="text-slate-400 italic">Chưa có chuyến được gán</span>'}
                </div>
            </div>
        </div>
    `;

    vaOpenModal(`Hồ sơ Bác tài: ${dName}`, body, null, null, { wide: true });
}

function vaContactDriverDirect(phone, name) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone === '---') {
        showToast('warning', `Bác tài ${name || ''} chưa có số điện thoại liên lạc.`);
        return;
    }
    const body = `
        <div class="space-y-4 text-xs">
            <p class="text-slate-600">Liên hệ nhanh với Bác tài <strong>${vaEsc(name || 'Bác tài')}</strong> qua Số điện thoại hoặc Zalo:</p>
            <div class="p-3 bg-slate-100 rounded-xl font-mono text-base font-bold text-slate-900 text-center select-all border border-slate-300">
                ${vaEsc(phone)}
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
                <button type="button" class="h-9 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs" onclick="window.open('https://zalo.me/${cleanPhone}', '_blank')">
                    <i class="ph-bold ph-chat-teardrop-text text-sm"></i> Mở Chat Zalo
                </button>
                <button type="button" class="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs" onclick="vaCopy('${cleanPhone}', 'Đã sao chép số điện thoại.')">
                    <i class="ph-bold ph-copy text-sm"></i> Sao chép SĐT
                </button>
            </div>
        </div>
    `;
    vaOpenModal(`Liên hệ: ${name}`, body, null, null);
}

async function vaViewUnallocatedContainersModal(allocId) {
    const l = vaFindAlloc(allocId);
    const bookingCode = l ? (l.booking_code || '---') : '---';
    const subName = l ? (l.subcontractor || 'Nhà xe') : 'Nhà xe';
    
    // Tải chi tiết các container thuộc allocation qua API /api/vendor-allocations/<id>/
    const { ok, out } = await vaApi(`/api/vendor-allocations/${allocId}/`);
    const allocData = ok && out && out.data ? out.data : (l || {});
    const rows = allocData.rows || [];
    const filled = allocData.filled || 0;
    const total = allocData.allocated_containers || rows.length || 0;
    const remaining = Math.max(0, total - filled);
    const vendorLink = allocData.vendor_link || (l && l.link) || '';

    let rowsHtml = '';
    if (rows.length) {
        rowsHtml = rows.map(r => {
            const hasTrip = !!r.trip_id;
            const cNum = r.container_number || '';
            const seal = r.seal_number || '';
            const plate = r.license_plate || '';
            const dName = r.driver_name || '';
            const dPhone = r.driver_phone || '';
            const tCode = r.trip_code || '';
            const statusLabel = r.step_status || 'Đang chờ điều xe';

            let stBadge = '';
            if (hasTrip) {
                stBadge = `<div class="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <i class="ph-bold ph-check-circle"></i> Đã gán xe
                </div>`;
            } else {
                stBadge = `<div class="inline-flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <i class="ph-bold ph-clock-countdown"></i> Chưa gán xe (Chờ nhà xe)
                </div>`;
            }

            return `
                <tr class="hover:bg-slate-50/80 transition-colors ${hasTrip ? '' : 'bg-amber-50/20'}">
                    <td class="p-3 font-mono font-bold text-slate-500 text-center w-12">${r.line_no}</td>
                    <td class="p-3">
                        <div class="font-mono font-bold text-slate-900 text-xs">${cNum ? vaEsc(cNum) : '<span class="text-slate-400 italic">Theo lệnh B/L</span>'}</div>
                        ${seal ? `<div class="font-mono text-slate-400 text-[11px] mt-0.5">Seal: ${vaEsc(seal)}</div>` : ''}
                    </td>
                    <td class="p-3">
                        ${stBadge}
                    </td>
                    <td class="p-3">
                        ${hasTrip ? `
                            <div class="flex items-center gap-1.5 flex-wrap">
                                ${plate ? `<span class="bg-slate-100 font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 text-xs">${vaEsc(plate)}</span>` : ''}
                                <span class="font-bold text-slate-800 text-xs">${vaEsc(dName || 'Bác tài')}</span>
                            </div>
                            ${dPhone ? `<div class="font-mono text-slate-500 text-[11px] mt-0.5">${vaEsc(dPhone)}</div>` : ''}
                        ` : '<span class="text-amber-800 italic text-xs">Chưa có thông tin xe & tài xế</span>'}
                    </td>
                    <td class="p-3">
                        ${hasTrip && tCode ? `
                            <button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer text-xs" onclick="vaCloseModal(); viewTripDetail('${vaEsc(tCode)}')">${vaEsc(tCode)}</button>
                        ` : '<span class="text-slate-400">---</span>'}
                    </td>
                    <td class="p-3 text-center">
                        ${hasTrip && tCode ? `
                            <button type="button" class="${VA_BTN_TEAL} text-xs py-1" onclick="vaCloseModal(); viewTripDetail('${vaEsc(tCode)}')">
                                <i class="ph-bold ph-eye"></i> Xem chuyến
                            </button>
                        ` : `
                            <span class="text-[11px] text-slate-400 font-medium">Chờ nhà xe</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        // Trường hợp chưa có chi tiết dòng container cụ thể
        rowsHtml = `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium">Phiếu chia ${total} container cho nhà xe ${vaEsc(subName)}. Hiện đã gán ${filled} cont, còn thiếu ${remaining} cont chưa được phân bổ xe.</td></tr>`;
    }

    const body = `
        <div class="space-y-4 text-xs">
            <!-- Header tóm tắt tiến độ -->
            <div class="p-4 bg-gradient-to-r from-amber-50/80 via-white to-teal-50/80 border border-amber-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-800 text-sm">Lệnh / Booking:</span>
                        <span class="font-mono font-bold text-teal-900 text-sm">${vaEsc(bookingCode)}</span>
                        <span class="text-slate-400">|</span>
                        <span class="font-bold text-slate-800 text-sm">Nhà xe:</span>
                        <span class="font-bold text-slate-900 text-sm">${vaEsc(subName)}</span>
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                        Theo dõi tiến độ nhận lệnh và gán phương tiện của nhà xe cho từng container trong phiếu chia.
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="text-xs font-bold text-slate-700">Tiến độ phân bổ:</div>
                        <div class="text-xs font-bold text-teal-800">${filled} / ${total} cont <span class="text-amber-700">(${remaining > 0 ? 'Còn thiếu ' + remaining + ' cont' : 'Đã đủ xe'})</span></div>
                    </div>
                    ${vendorLink ? `
                        <button type="button" class="h-8 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs" onclick="window.open('${vaEsc(vendorLink)}', '_blank')" title="Mở Cổng Nhà Xe để gán hộ hoặc hỗ trợ">
                            <i class="ph-bold ph-desktop"></i> Cổng Nhà Xe
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Bảng danh sách các container -->
            <div class="overflow-x-auto border border-slate-200 rounded-xl max-h-[50vh] overflow-y-auto">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th class="p-3 text-center w-12">STT</th>
                            <th class="p-3">Số Container & Seal</th>
                            <th class="p-3">Tình Trạng Phân Bổ</th>
                            <th class="p-3">Xe & Bác Tài Phụ Trách</th>
                            <th class="p-3">Mã Chuyến</th>
                            <th class="p-3 text-center w-28">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white font-medium">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div class="flex items-center gap-2">
                    <i class="ph-bold ph-info text-amber-700 text-sm"></i>
                    <span>Màn hình theo dõi nội bộ của Điều Vận GSS. Khi nhà xe cập nhật xe/tài trên Cổng Nhà Xe, dữ liệu sẽ tự động đồng bộ.</span>
                </div>
            </div>
        </div>
    `;

    vaOpenModal(`Danh sách Container Phiếu Chia: ${bookingCode}`, body, null, null, { extraWide: true });
}

window.vaViewVehicleDetail = vaViewVehicleDetail;
window.vaViewVehicleTrips = vaViewVehicleTrips;
window.vaViewDriverDetail = vaViewDriverDetail;
window.vaContactDriverDirect = vaContactDriverDirect;
window.vaViewUnallocatedContainersModal = vaViewUnallocatedContainersModal;

// -------------------------------------------------------------
// XUẤT / NHẬP EXCEL & GỬI TIN NHẮN TỔNG HỢP CHO ĐIỀU VẬN VENDOR
// -------------------------------------------------------------
async function vaShareVendorBatchZalo(allocId) {
    try {
        const res = await fetchWithAuth(`/api/vendor-allocations/${allocId}/batch-message/`);
        if (!res.ok) throw new Error('Không thể lấy nội dung tin nhắn gửi nhà xe');
        const json = await res.json();
        const data = json.data || {};
        const msg = data.message || '';
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(msg);
        }
        
        if (data.zalo_url) {
            showToast('success', `Đã sao chép danh sách link lệnh! Đang mở Zalo Điều vận ${data.vendor_name} (${data.vendor_phone}). Hãy dán (Ctrl+V) để gửi ngay.`, 'Mở Zalo Điều Vận');
            window.open(data.zalo_url, '_blank');
        } else {
            showToast('success', `Đã sao chép toàn bộ danh sách link lệnh cho Nhà xe ${data.vendor_name} vào bộ nhớ tạm!`, 'Đã Sao Chép Danh Sách Link');
        }
    } catch (e) {
        showToast('danger', e.message || 'Lỗi gửi tin nhắn cho Điều vận Vendor');
    }
}
window.vaShareVendorBatchZalo = vaShareVendorBatchZalo;

function vaExportAllocExcel(allocId) {
    window.location.href = `/api/vendor-allocations/${allocId}/excel/`;
    showToast('info', 'Đang tải file Excel danh sách gán xe...', 'Xuất Excel');
}
window.vaExportAllocExcel = vaExportAllocExcel;

function vaTriggerAllocExcelUpload(allocId) {
    let inp = document.getElementById('va-temp-excel-file-inp');
    if (!inp) {
        inp = document.createElement('input');
        inp.id = 'va-temp-excel-file-inp';
        inp.type = 'file';
        inp.accept = '.xlsx,.xls';
        inp.className = 'hidden';
        document.body.appendChild(inp);
    }
    inp.onchange = async function() {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        showToast('info', 'Đang kiểm tra và nhập file Excel...', 'Nhập Excel');
        try {
            const res = await fetchWithAuth(`/api/vendor-allocations/${allocId}/excel/`, {
                method: 'POST',
                body: fd
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || json.error || 'Lỗi khi nhập file Excel');
            showToast('success', json.message || `Đã cập nhật thành công ${json.saved || 0} dòng từ Excel!`, 'Nhập Excel Thành Công');
            loadVendorAdminTab(true);
        } catch (e) {
            showToast('danger', e.message, 'Lỗi Nhập Excel');
        } finally {
            inp.value = '';
        }
    };
    inp.click();
}
window.vaTriggerAllocExcelUpload = vaTriggerAllocExcelUpload;

// =============================================================
// DROPDOWN QUẢN LÝ EXCEL CHO PHIẾU PHÂN BỔ NHÀ XE
// =============================================================
function vaToggleAllocExcelMenu(event, allocId) {
    if (event) event.stopPropagation();
    const currentMenu = document.getElementById(`alloc-excel-menu-${allocId}`);
    if (!currentMenu) return;
    const isOpen = !currentMenu.classList.contains('hidden');
    
    closeAllAllocExcelDropdowns();
    
    if (!isOpen) {
        const btn = event.currentTarget;
        if (btn) {
            const rect = btn.getBoundingClientRect();
            if (rect.bottom + 90 > window.innerHeight) {
                currentMenu.classList.add('bottom-full', 'mb-1');
                currentMenu.classList.remove('mt-1');
            } else {
                currentMenu.classList.remove('bottom-full', 'mb-1');
                currentMenu.classList.add('mt-1');
            }
        }
        currentMenu.classList.remove('hidden');
    }
}
window.vaToggleAllocExcelMenu = vaToggleAllocExcelMenu;

function closeAllAllocExcelDropdowns() {
    document.querySelectorAll('.alloc-excel-dropdown').forEach(m => m.classList.add('hidden'));
}
window.closeAllAllocExcelDropdowns = closeAllAllocExcelDropdowns;

document.addEventListener('click', function(e) {
    if (!e.target.closest('.alloc-excel-dropdown')) {
        closeAllAllocExcelDropdowns();
    }
});
