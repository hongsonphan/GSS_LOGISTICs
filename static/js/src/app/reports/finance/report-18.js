// BÁO CÁO 18: BẢNG KÊ QUYẾT TOÁN & ĐỐI SOÁT - chỉ xem / in / xuất. Lập, sửa, duyệt, mở lại nằm ở phân hệ Kế toán.
let rep18Cache = [];

function _rep18Query(extra = '') {
    const q = [];
    ['party', 'status'].forEach(k => { const v = document.getElementById(`rep18-${k}`)?.value; if (v) q.push(`${k === 'party' ? 'party_type' : 'status'}=${v}`); });
    const from = document.getElementById('rep18-from')?.value;
    const to = document.getElementById('rep18-to')?.value;
    if (from) q.push(`from=${from}`);
    if (to) q.push(`to=${to}`);
    if (extra) q.push(extra);
    return q.length ? '?' + q.join('&') : '';
}

async function loadReport18() {
    const tb = document.getElementById('rep18-tbody');
    if (!tb) return;
    try {
        const res = await fetchWithAuth('/api/reports/settlement-vouchers/' + _rep18Query());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || 'Không tải được báo cáo');
        rep18Cache = data.vouchers || [];
        const s = data.summary || {};
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
        set('rep18-stat-count', s.count || 0);
        set('rep18-stat-status', `Đã duyệt: ${s.approved || 0} | Chờ duyệt: ${s.draft || 0}`);
        set('rep18-stat-receive', formatMoneyVND(s.total_receive || 0));
        set('rep18-stat-pay', formatMoneyVND(s.total_pay || 0));
        set('rep18-stat-net', formatMoneyVND((s.total_receive || 0) - (s.total_pay || 0)));
        renderReport18();
    } catch (err) {
        tb.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-rose-600 font-bold">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderReport18() {
    const tb = document.getElementById('rep18-tbody');
    if (!tb) return;
    const q = (document.getElementById('rep18-search')?.value || '').trim().toLowerCase();
    const list = rep18Cache.filter(v => !q || `${v.code} ${v.party_name} ${v.cash_transaction_code}`.toLowerCase().includes(q));
    tb.innerHTML = list.map(v => `<tr class="cursor-pointer hover:bg-slate-50" onclick="openReport18Voucher(${v.id})" title="Bấm để xem bảng kê chi tiết">
        <td data-col-key="code" class="font-mono font-bold text-teal-800">${escapeHtml(v.code)}</td>
        <td data-col-key="party">${escapeHtml(v.party_type_label)}</td><td data-col-key="name">${escapeHtml(v.party_name)}</td>
        <td data-col-key="trips" class="text-center">${v.trips_count}</td>
        <td data-col-key="amount" class="text-right font-mono font-bold">${formatMoneyVND(v.amount)}</td>
        <td data-col-key="direction">${v.direction === 'RECEIVE' ? '<span class="text-blue-700 font-bold">Thu</span>' : '<span class="text-rose-700 font-bold">Chi</span>'}</td>
        <td data-col-key="status"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">${escapeHtml(v.status_label)}</span></td>
        <td data-col-key="cash" class="font-mono">${escapeHtml(v.cash_transaction_code || '-')}</td>
        <td data-col-key="date">${escapeHtml(v.created_at)}</td><td data-col-key="approved">${escapeHtml(v.approved_at || '-')}</td></tr>`).join('')
        || '<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Chưa có bảng kê quyết toán trong điều kiện lọc</td></tr>';
}

async function openReport18Voucher(id) {
    try {
        const res = await fetchWithAuth(`/api/reports/settlement-vouchers/${id}/`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không tìm thấy bảng kê');
        showSettlementVoucherModal(data.voucher, { readonly: true });
    } catch (err) {
        showToast('danger', err.message, 'Báo cáo');
    }
}

async function exportReport18() {
    try {
        const res = await fetchWithAuth('/api/reports/settlement-vouchers/' + _rep18Query('export=xlsx'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bang-ke-quyet-toan.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('success', 'Đã tải "bang-ke-quyet-toan.xlsx"', 'Xuất Excel');
    } catch (err) {
        showToast('danger', 'Không xuất được file Excel', 'Xuất Excel');
    }
}

window.loadReport18 = loadReport18;
window.renderReport18 = renderReport18;
window.openReport18Voucher = openReport18Voucher;
window.exportReport18 = exportReport18;
