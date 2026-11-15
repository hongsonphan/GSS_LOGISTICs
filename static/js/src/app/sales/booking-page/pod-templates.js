// GSS: quản lý mẫu Phiếu giao hàng / Biên bản (tạo, sửa, xem trước) và gán mẫu cho từng khách hàng.
// Mở từ ô "Mẫu Phiếu Giao Hàng" trên trang chi tiết Booking. Ghi mẫu chỉ dành cho Quản trị/Giám đốc (máy chủ kiểm quyền).

function ptEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

const PT_INPUT = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-600 text-slate-800 text-xs font-medium';
const PT_BTN = 'min-h-[40px] px-4 rounded-xl border font-bold text-xs cursor-pointer ';

async function ptJson(url, method, body) {
    const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.success === false) throw new Error(out.message || out.detail || 'Thao tác thất bại.');
    return out;
}

async function openPodTemplateManager() {
    if (document.getElementById('pod-template-manager')) return;
    const overlay = ptEl('div', 'fixed inset-0 z-[300] bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto');
    overlay.id = 'pod-template-manager';
    const box = ptEl('div', 'bg-white rounded-2xl w-full max-w-5xl shadow-xl my-6 p-5 sm:p-6 space-y-4');
    overlay.append(box);
    document.body.append(overlay);
    const close = () => { overlay.remove(); if (typeof loadBookingPodTemplates === 'function') { bookingPodTemplatesCache = null; loadBookingPodTemplates(document.getElementById('fullpage-booking-pod-template')?.value); } };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    let state = { templates: [], customers: [], placeholders: [], current: null };

    async function reload(selectId) {
        const out = await ptJson('/api/gss/pod-templates/', 'GET');
        state.templates = out.templates || [];
        state.customers = out.customers || [];
        state.placeholders = out.placeholders || [];
        state.current = state.templates.find(t => t.id === selectId) || state.templates.find(t => t.id === (state.current && state.current.id)) || null;
        paint();
    }

    function paint() {
        box.replaceChildren();
        const head = ptEl('div', 'flex items-center justify-between gap-2 pb-3 border-b border-slate-100');
        head.append(ptEl('h3', 'text-sm font-black text-slate-800 uppercase tracking-wider', 'Mẫu Phiếu Giao Hàng / Biên Bản'));
        const x = ptEl('button', PT_BTN + 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100', 'Đóng');
        x.type = 'button'; x.addEventListener('click', close);
        head.append(x);
        box.append(head);

        const cols = ptEl('div', 'grid grid-cols-1 md:grid-cols-12 gap-4');
        box.append(cols);

        // Danh sách mẫu
        const left = ptEl('div', 'md:col-span-4 space-y-2');
        const add = ptEl('button', PT_BTN + 'w-full bg-teal-600 border-teal-600 text-white hover:bg-teal-500', '+ Tạo mẫu mới');
        add.type = 'button';
        add.addEventListener('click', () => { state.current = { id: null, code: '', name: '', header_html: '', body_html: '', terms_html: '', is_default: false, is_active: true }; paint(); });
        left.append(add);
        if (!state.templates.length) left.append(ptEl('div', 'text-xs text-slate-500', 'Chưa có mẫu riêng. Hệ thống đang dùng mẫu mặc định.'));
        state.templates.forEach(t => {
            const on = state.current && state.current.id === t.id;
            const b = ptEl('button', 'w-full text-left p-3 rounded-xl border text-xs cursor-pointer ' + (on ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'));
            b.type = 'button';
            b.append(ptEl('div', 'font-bold text-slate-800', t.name));
            b.append(ptEl('div', 'text-slate-500 font-mono', t.code + (t.is_default ? ' · mặc định' : '') + (t.is_active ? '' : ' · đã tắt') + ` · ${t.customers} khách`));
            b.addEventListener('click', () => { state.current = t; paint(); });
            left.append(b);
        });
        cols.append(left);

        // Trình soạn
        const right = ptEl('div', 'md:col-span-8 space-y-3');
        const t = state.current;
        if (!t) {
            right.append(ptEl('div', 'text-xs text-slate-500 p-4', 'Chọn một mẫu bên trái để sửa, hoặc tạo mẫu mới.'));
        } else {
            const field = (label, node) => { const w = ptEl('div'); w.append(ptEl('label', 'block font-bold text-slate-700 text-xs mb-1', label), node); return w; };
            const code = ptEl('input', PT_INPUT); code.value = t.code || ''; code.maxLength = 40; code.placeholder = 'VD: MAU_KH_A';
            const name = ptEl('input', PT_INPUT); name.value = t.name || ''; name.maxLength = 150; name.placeholder = 'VD: Biên bản giao hàng - Khách A';
            const mk = (v, rows, ph) => { const a = ptEl('textarea', PT_INPUT + ' font-mono'); a.rows = rows; a.value = v || ''; a.placeholder = ph; return a; };
            const header = mk(t.header_html, 3, '<h2 style="text-align:center">BIÊN BẢN GIAO HÀNG</h2>');
            const body = mk(t.body_html, 8, '<table>…</table> dùng {{ container_number }}, {{ customer_name }}…');
            const terms = mk(t.terms_html, 3, 'Điều khoản / ghi chú cuối phiếu');
            const dflt = ptEl('input'); dflt.type = 'checkbox'; dflt.checked = !!t.is_default;
            const act = ptEl('input'); act.type = 'checkbox'; act.checked = t.is_active !== false;
            const flags = ptEl('div', 'flex flex-wrap gap-4 text-xs font-bold text-slate-700');
            const l1 = ptEl('label', 'flex items-center gap-1.5 cursor-pointer'); l1.append(dflt, document.createTextNode('Dùng làm mẫu mặc định'));
            const l2 = ptEl('label', 'flex items-center gap-1.5 cursor-pointer'); l2.append(act, document.createTextNode('Đang sử dụng'));
            flags.append(l1, l2);
            const grid = ptEl('div', 'grid grid-cols-1 sm:grid-cols-2 gap-3'); grid.append(field('Mã mẫu *', code), field('Tên mẫu *', name));
            right.append(grid, field('Đầu phiếu (HTML)', header), field('Nội dung biên bản * (HTML)', body), field('Điều khoản cuối phiếu (HTML)', terms), flags);
            right.append(ptEl('div', 'text-[11px] text-slate-500 leading-relaxed', 'Biến có thể chèn: ' + state.placeholders.map(p => '{{ ' + p + ' }}').join('  ')));

            const bar = ptEl('div', 'flex flex-wrap gap-2 pt-1');
            const save = ptEl('button', PT_BTN + 'bg-teal-600 border-teal-600 text-white hover:bg-teal-500', 'Lưu mẫu'); save.type = 'button';
            save.addEventListener('click', async () => {
                save.disabled = true;
                try {
                    const payload = { code: code.value, name: name.value, header_html: header.value, body_html: body.value, terms_html: terms.value, is_default: dflt.checked, is_active: act.checked };
                    const out = await ptJson(t.id ? `/api/gss/pod-templates/${t.id}/` : '/api/gss/pod-templates/', t.id ? 'PUT' : 'POST', payload);
                    showToast('success', out.message || 'Đã lưu mẫu.');
                    await reload(out.data && out.data.id);
                } catch (e) { showToast('danger', e.message); } finally { save.disabled = false; }
            });
            bar.append(save);
            if (t.id) {
                const prev = ptEl('button', PT_BTN + 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100', 'Xem trước / In thử'); prev.type = 'button';
                prev.addEventListener('click', () => window.open(`/api/gss/pod-templates/${t.id}/preview/`, '_blank', 'noopener'));
                const del = ptEl('button', PT_BTN + 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50', 'Xóa mẫu'); del.type = 'button';
                del.addEventListener('click', async () => {
                    if (!window.confirm(`Xóa mẫu "${t.name}"? Mẫu đang gán cho khách hàng thì không xóa được.`)) return;
                    try { await ptJson(`/api/gss/pod-templates/${t.id}/`, 'DELETE'); showToast('success', 'Đã xóa mẫu.'); state.current = null; await reload(); }
                    catch (e) { showToast('danger', e.message); }
                });
                bar.append(prev, del);
            }
            right.append(bar);
        }
        cols.append(right);

        // Gán mẫu cho khách hàng
        const assign = ptEl('div', 'pt-3 border-t border-slate-100 space-y-2');
        assign.append(ptEl('div', 'text-xs font-black text-slate-800 uppercase tracking-wider', 'Gán mẫu cho khách hàng'));
        assign.append(ptEl('div', 'text-[11px] text-slate-500', 'Chuyến của khách hàng sẽ tự sinh phiếu theo mẫu được gán (Booking có thể chọn mẫu riêng). Khách chưa gán dùng mẫu mặc định.'));
        const tbl = ptEl('div', 'grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto');
        state.customers.forEach(c => {
            const row = ptEl('div', 'flex items-center gap-2 p-2 rounded-xl border border-slate-200 text-xs');
            row.append(ptEl('span', 'flex-1 font-bold text-slate-800 truncate', c.name));
            const sel = ptEl('select', 'min-h-[36px] px-2 bg-white border border-slate-300 rounded-lg text-xs max-w-[48%]');
            sel.append(new Option('Mặc định', ''));
            state.templates.filter(x => x.is_active).forEach(x => sel.append(new Option(x.name, x.id)));
            sel.value = c.pod_template_id ? String(c.pod_template_id) : '';
            sel.addEventListener('change', async () => {
                try {
                    await ptJson(`/api/gss/customers/${c.id}/pod-template/`, 'PUT', { template_id: sel.value ? Number(sel.value) : null });
                    c.pod_template_id = sel.value ? Number(sel.value) : null;
                    showToast('success', `Đã gán mẫu cho ${c.name}.`);
                } catch (e) { showToast('danger', e.message); sel.value = c.pod_template_id ? String(c.pod_template_id) : ''; }
            });
            row.append(sel);
            tbl.append(row);
        });
        if (!state.customers.length) tbl.append(ptEl('div', 'text-xs text-slate-500', 'Chưa có khách hàng.'));
        assign.append(tbl);
        box.append(assign);
    }

    try { await reload(); } catch (e) { overlay.remove(); showToast('danger', e.message || 'Không tải được mẫu phiếu.'); }
}
window.openPodTemplateManager = openPodTemplateManager;
