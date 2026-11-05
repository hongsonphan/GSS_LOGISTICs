// GSS: hạn lệnh DEM/DET, ghi chú điểm đến và chia cont cho nhà xe trên trang chi tiết Booking.

const DEMDET_LEVELS = {
    ok: ['bg-emerald-100 text-emerald-800', 'Còn hạn'],
    warn: ['bg-amber-100 text-amber-800', 'Sắp hết hạn'],
    overdue: ['bg-rose-100 text-rose-800', 'QUÁ HẠN'],
    none: ['bg-slate-100 text-slate-600', 'Chưa có hạn'],
};

function fillBookingDemDet(b) {
    const card = document.getElementById('fullpage-demdet-card');
    if (card) card.classList.toggle('hidden', typeof hasFeature === 'function' && !hasFeature('dem_det_alerts'));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
    set('fullpage-booking-dem-start', b && b.dem_start_date);
    set('fullpage-booking-det-start', b && b.det_start_date);
    set('fullpage-booking-dem-override', b && b.dem_expiry_override);
    set('fullpage-booking-det-override', b && b.det_expiry_override);
    set('fullpage-booking-dest-notes', b && b.destination_notes);
    set('fullpage-booking-road-restrictions', b && b.road_restrictions);
    const box = document.getElementById('fullpage-demdet-summary');
    if (!box) return;
    box.replaceChildren();
    if (!b) return;
    [['Hạn DEM', b.dem], ['Hạn DET', b.det]].forEach(([label, d]) => {
        if (!d) return;
        const [cls, text] = DEMDET_LEVELS[d.level] || DEMDET_LEVELS.none;
        const span = document.createElement('span');
        span.className = 'px-2.5 py-1 rounded-lg ' + cls;
        const date = d.expiry ? d.expiry.split('-').reverse().join('/') : '—';
        span.textContent = `${label}: ${date} · ${text}` + (d.days_left != null && d.level !== 'none' ? ` (${d.days_left} ngày)` : '');
        box.appendChild(span);
    });
}

function collectBookingDemDet() {
    const val = (id) => (document.getElementById(id)?.value || '').trim();
    return [
        ['dem_start_date', val('fullpage-booking-dem-start')],
        ['det_start_date', val('fullpage-booking-det-start')],
        ['dem_expiry_override', val('fullpage-booking-dem-override')],
        ['det_expiry_override', val('fullpage-booking-det-override')],
        ['destination_notes', val('fullpage-booking-dest-notes')],
        ['road_restrictions', val('fullpage-booking-road-restrictions')],
    ];
}

// ---------- Chia cont cho nhà xe ----------
let vendorAllocBookingId = null;

function vaEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

async function renderBookingVendorAllocations(b) {
    const host = document.getElementById('fullpage-vendor-allocations');
    if (!host) return;
    const enabled = typeof hasFeature !== 'function' || hasFeature('vendor_portal');
    if (!b || !b.id || !enabled) { host.classList.add('hidden'); host.replaceChildren(); return; }
    vendorAllocBookingId = b.id;
    host.classList.remove('hidden');
    host.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3';
    try {
        const res = await fetchWithAuth(`/api/bookings/${b.id}/vendor-allocations/`);
        const out = await res.json();
        if (!res.ok || !out.success) throw new Error(out.message || 'Không tải được phiếu chia cont.');
        paintVendorAllocations(host, out.data);
    } catch (err) {
        host.replaceChildren(vaEl('div', 'text-xs text-rose-600 font-semibold', err.message));
    }
}

function paintVendorAllocations(host, data) {
    const head = vaEl('div', 'flex flex-wrap items-center justify-between gap-2');
    head.append(vaEl('div', 'font-bold text-slate-800 text-sm', `Chia cont cho nhà xe — đã chia ${data.allocated}/${data.total_containers}, còn ${data.remaining}`));
    host.replaceChildren(head);

    const list = vaEl('div', 'space-y-2');
    if (!data.allocations.length) list.append(vaEl('div', 'text-xs text-slate-500', 'Chưa chia cont cho nhà xe nào.'));
    data.allocations.forEach(a => {
        const row = vaEl('div', 'flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs');
        row.append(vaEl('b', 'text-slate-800', a.subcontractor));
        row.append(vaEl('span', 'font-mono', `${a.filled}/${a.allocated_containers} xe`));
        const st = vaEl('span', 'px-2 py-0.5 rounded-full font-bold ' + (a.locked ? 'bg-slate-200 text-slate-700' : a.expired ? 'bg-rose-100 text-rose-800' : a.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'),
            a.expired ? 'Link hết hạn' : a.status_label);
        row.append(st);
        const spacer = vaEl('span'); spacer.style.flex = '1'; row.append(spacer);
        const mk = (label, fn) => { const bt = vaEl('button', 'min-h-[36px] px-3 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer', label); bt.type = 'button'; bt.addEventListener('click', fn); return bt; };
        row.append(mk('Cấp link mới', () => vendorAllocAction(a.id, 'regenerate', host)));
        row.append(mk('Đổi số cont', () => vendorAllocResize(a, host)));
        row.append(mk(a.locked ? 'Mở khóa' : 'Khóa', () => vendorAllocAction(a.id, a.locked ? 'unlock' : 'lock', host)));
        if (!a.filled) row.append(mk('Thu hồi', () => vendorAllocAction(a.id, 'revoke', host)));
        list.append(row);
    });
    host.append(list);

    if (data.remaining > 0) {
        const form = vaEl('div', 'grid grid-cols-1 md:grid-cols-12 gap-2 items-end pt-2 border-t border-slate-100');
        const sel = vaEl('select', 'md:col-span-6 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white');
        sel.id = 'va-sub';
        sel.append(new Option('— Chọn nhà xe —', ''));
        const num = vaEl('input', 'md:col-span-3 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm');
        num.type = 'number'; num.min = 1; num.max = data.remaining; num.value = data.remaining; num.id = 'va-count';
        const btn = vaEl('button', 'md:col-span-3 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm cursor-pointer', 'Chia & lấy link');
        btn.type = 'button';
        btn.addEventListener('click', async () => {
            if (!sel.value) { showToast('warning', 'Hãy chọn nhà xe.'); return; }
            btn.disabled = true;
            try {
                const res = await fetchWithAuth(`/api/bookings/${vendorAllocBookingId}/vendor-allocations/`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subcontractor_id: Number(sel.value), allocated_containers: Number(num.value) }),
                });
                const out = await res.json();
                if (!res.ok || !out.success) { showToast('danger', out.message || 'Không chia được.'); return; }
                showToast('success', out.message);
                await showVendorLink(out.link);
                await renderBookingVendorAllocations({ id: vendorAllocBookingId });
            } finally { btn.disabled = false; }
        });
        form.append(sel, num, btn);
        host.append(form);
        fetchWithAuth('/api/master-data/subcontractors/').then(r => r.json()).then(j => {
            (j.results || []).filter(s => s.is_active !== false && (!s.partner_type || s.partner_type === 'CARRIER'))
                .forEach(s => sel.append(new Option(s.short_name || s.name, s.id)));
        }).catch(() => showToast('warning', 'Không tải được danh sách nhà xe.'));
    }
}

async function vendorAllocAction(id, action, host) {
    if (action === 'revoke' && !window.confirm('Thu hồi phiếu này? Link của nhà xe sẽ ngừng hoạt động.')) return;
    const res = await fetchWithAuth(`/api/vendor-allocations/${id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    });
    const out = await res.json();
    if (!res.ok || !out.success) { showToast('danger', out.message || 'Thao tác thất bại.'); return; }
    showToast('success', out.message);
    if (out.link) await showVendorLink(out.link);
    await renderBookingVendorAllocations({ id: vendorAllocBookingId });
}

async function vendorAllocResize(a, host) {
    const v = window.prompt(`Số cont giao cho ${a.subcontractor}:`, a.allocated_containers);
    if (v === null) return;
    const res = await fetchWithAuth(`/api/vendor-allocations/${a.id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allocated_containers: Number(v) }),
    });
    const out = await res.json();
    if (!res.ok || !out.success) { showToast('danger', out.message || 'Không đổi được.'); return; }
    showToast('success', out.message);
    await renderBookingVendorAllocations({ id: vendorAllocBookingId });
}

// Link chỉ hiện một lần: cho sao chép hoặc mở Zalo để gửi
function showVendorLink(link) {
    return new Promise(resolve => {
        const overlay = vaEl('div', 'fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4');
        const box = vaEl('div', 'bg-white rounded-2xl p-5 max-w-lg w-full space-y-3 shadow-xl');
        box.append(vaEl('div', 'font-black text-slate-900', 'Link cho nhà xe'));
        box.append(vaEl('div', 'text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2', 'Link chỉ hiện một lần. Hãy sao chép và gửi ngay; nếu mất, bấm "Cấp link mới" (link cũ sẽ ngừng hoạt động).'));
        const inp = vaEl('input', 'w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs font-mono');
        inp.readOnly = true; inp.value = link;
        const row = vaEl('div', 'flex gap-2 justify-end');
        const copy = vaEl('button', 'min-h-[44px] px-4 rounded-xl bg-teal-600 text-white font-bold text-sm cursor-pointer', 'Sao chép');
        const zalo = vaEl('a', 'min-h-[44px] px-4 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center cursor-pointer', 'Gửi Zalo');
        zalo.href = 'https://zalo.me/share?url=' + encodeURIComponent(link); zalo.target = '_blank'; zalo.rel = 'noopener noreferrer';
        const close = vaEl('button', 'min-h-[44px] px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer', 'Đóng');
        copy.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(link); copy.textContent = 'Đã sao chép ✓'; }
            catch (e) { inp.select(); document.execCommand('copy'); copy.textContent = 'Đã sao chép ✓'; }
        });
        close.addEventListener('click', () => { overlay.remove(); resolve(); });
        row.append(copy, zalo, close);
        box.append(inp, row);
        overlay.append(box);
        document.body.append(overlay);
        inp.select();
    });
}
