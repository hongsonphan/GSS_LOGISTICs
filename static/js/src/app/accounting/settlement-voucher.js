// Phiếu Quyết Toán dùng chung cho Tài xế / Đối tác 3PL / Khách hàng.
// Quy trình: chọn chuyến -> Quyết toán -> Bảng kê rà soát (lưu nháp) -> Duyệt -> (Mở lại) Sửa | Lưu | Xóa | In.
// Mỗi đối tượng chỉ thấy cột liên quan: tài xế/đối tác không thấy giá cước khách hàng, khách hàng không thấy chi phí tài xế/đối tác.
const SETTLE_VOUCHER_API = '/api/accounting/settlement-vouchers/';
const SETTLE_PARTY_LABEL = { DRIVER: 'Tài Xế', PARTNER: 'Đối Tác 3PL', CUSTOMER: 'Khách Hàng' };
let currentSettleVoucher = null;

function settleVoucherTotal(party, line, adj) {
    if (party === 'DRIVER') return (line.advance || 0) - (line.spent || 0) - adj;
    if (party === 'PARTNER') {
        const reimb = (line.expense_lines || []).reduce((s, e) => s + e.amount, 0);
        return (line.freight_cost || 0) + reimb - (line.advance || 0) + adj;
    }
    const obh = (line.expense_lines || []).reduce((s, e) => s + e.amount, 0);
    return (line.freight || 0) + obh + adj;
}

async function openSettlementStatement(partyType, ids, extra = {}) {
    if (!ids || ids.length === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất một chuyến xe để quyết toán!', 'Chưa chọn chuyến');
        return;
    }
    try {
        const body = Object.assign({ party_type: partyType, split_by_party: true }, extra);
        if (typeof ids[0] === 'string') body.trip_codes = ids; else body.trip_ids = ids;
        const res = await fetchWithAuth(SETTLE_VOUCHER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || data.detail || 'Không thể lập bảng kê quyết toán');
        const made = data.vouchers || [data.voucher];
        if (made.length > 1) {
            // Nhiều đối tượng trong một lần chọn: mỗi đối tượng một bảng kê riêng, mở danh sách để rà soát từng phiếu
            showToast('success', `Đã lập ${made.length} bảng kê (mỗi ${SETTLE_PARTY_LABEL[partyType].toLowerCase()} một phiếu): ${made.map(v => v.code).join(', ')}`, 'Tách phiếu theo đối tượng');
            if (typeof switchAccountingSubTab === 'function') switchAccountingSubTab('acct-vouchers');
            return;
        }
        showSettlementVoucherModal(data.voucher);
    } catch (err) {
        showToast('danger', err.message || 'Lỗi kết nối máy chủ', 'Lỗi lập bảng kê');
    }
}

async function openSettlementVoucher(id) {
    try {
        const res = await fetchWithAuth(`${SETTLE_VOUCHER_API}${id}/`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không tìm thấy phiếu');
        document.getElementById('settle-voucher-list-modal')?.remove();
        showSettlementVoucherModal(data.voucher);
    } catch (err) {
        showToast('danger', err.message, 'Lỗi');
    }
}

function settleLineRow(party, l, i, editable) {
    const lines = (l.expense_lines || []).map(e =>
        `<div class="flex justify-between gap-3"><span>${escapeHtml(e.name)}${e.leg ? ` <span class="text-slate-400">(${escapeHtml(e.leg)})</span>` : ''}</span><span class="tabular-nums font-mono">${formatMoneyVND(e.amount)}</span></div>`
    ).join('') || '<span class="text-slate-400 italic">Không có</span>';
    const adjInput = `<input type="number" step="1000" value="${l.adjustment || 0}" ${editable ? '' : 'disabled'} data-adjust-trip="${l.trip_id}"
        oninput="recalcSettleVoucher()" class="w-28 px-1.5 py-1 text-right font-mono font-bold border border-amber-300 rounded bg-amber-50 disabled:bg-slate-50 disabled:border-slate-200"
        title="Số phát sinh do Kế toán/Hành chính nhập (+ cộng thêm, - trừ bớt)">`;
    const common = `<td class="px-2 py-2 text-center">${i + 1}</td>
        <td class="px-2 py-2 font-bold">${escapeHtml(l.trip_code)}<div class="text-[10px] text-slate-500 font-normal">${escapeHtml(l.date)}</div></td>`;
    const cont = `<td class="px-2 py-2">${escapeHtml(l.container_number)}<div class="text-[10px] text-slate-500">${escapeHtml(l.container_type)}</div></td>
        <td class="px-2 py-2">${escapeHtml(l.route)}</td>`;
    const total = `<td class="px-2 py-2 text-right tabular-nums font-mono font-bold" data-line-total="${l.trip_id}"></td>`;

    if (party === 'DRIVER') {
        const split = l.is_split_trip ? `
            <div class="p-1.5 rounded-lg border-2 border-rose-400 bg-rose-50">
                <div class="text-[10px] font-black text-rose-700 mb-1">CẮT KÉO - KIỂM TRA KỸ TỶ LỆ THÙ LAO</div>
                <div class="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                    <span class="truncate">${escapeHtml(l.driver_name)}</span>
                    <input type="number" min="0" max="100" step="1" value="${l.split_ratio}" ${editable ? '' : 'disabled'} data-split-trip="${l.trip_id}"
                        oninput="onSettleSplitInput(this)" class="w-14 px-1 py-0.5 text-center font-black text-rose-800 border border-rose-400 rounded bg-white">%
                    <span class="text-slate-400">/</span>
                    <span class="truncate">${escapeHtml(l.dropoff_driver_name || 'Chưa gán tài 2')}</span>
                    <span class="w-12 text-center font-black" id="settle-split2-${l.trip_id}">${100 - l.split_ratio}%</span>
                </div>
            </div>` : '<span class="text-slate-400">-</span>';
        return `<tr class="border-b border-slate-100 align-top">${common}
            <td class="px-2 py-2">${escapeHtml(l.driver_name)}<div class="text-[10px] text-slate-500">${escapeHtml(l.license_plate)}</div></td>${cont}
            <td class="px-2 py-2 text-[11px] min-w-[200px]">${lines}</td>
            <td class="px-2 py-2 text-right tabular-nums font-mono">${formatMoneyVND(l.advance)}</td>
            <td class="px-2 py-2 text-right tabular-nums font-mono">${formatMoneyVND(l.spent)}</td>
            <td class="px-2 py-2">${adjInput}</td><td class="px-2 py-2 min-w-[210px]">${split}</td>${total}</tr>`;
    }
    if (party === 'PARTNER') {
        return `<tr class="border-b border-slate-100 align-top">${common}
            <td class="px-2 py-2">${escapeHtml(l.license_plate)}<div class="text-[10px] text-slate-500">${escapeHtml(l.driver_name)}</div></td>${cont}
            <td class="px-2 py-2 text-right tabular-nums font-mono">${formatMoneyVND(l.freight_cost)}</td>
            <td class="px-2 py-2 text-[11px] min-w-[200px]">${lines}</td>
            <td class="px-2 py-2 text-right tabular-nums font-mono">${formatMoneyVND(l.advance)}</td>
            <td class="px-2 py-2">${adjInput}</td>${total}</tr>`;
    }
    return `<tr class="border-b border-slate-100 align-top">${common}
        <td class="px-2 py-2">${escapeHtml(l.booking_or_bill)}</td>${cont}
        <td class="px-2 py-2 text-right tabular-nums font-mono">${formatMoneyVND(l.freight)}</td>
        <td class="px-2 py-2 text-[11px] min-w-[200px]">${lines}</td>
        <td class="px-2 py-2">${adjInput}</td>${total}</tr>`;
}

function settleHeadCols(party) {
    const th = (t, r) => `<th class="px-2 py-2 ${r ? 'text-right' : 'text-left'}">${t}</th>`;
    const base = '<th class="px-2 py-2">STT</th>' + th('Mã chuyến') ;
    if (party === 'DRIVER') return base + th('Tài xế / Xe') + th('Số cont / Loại') + th('Tuyến') + th('Chi phí phát sinh (hạ xa, dầu, vé...)') + th('Tạm ứng', 1) + th('Thực chi', 1) + th('Phát sinh', 1) + th('Tỷ lệ thù lao cắt kéo') + th('Chênh lệch', 1);
    if (party === 'PARTNER') return base + th('Xe / Tài xế') + th('Số cont / Loại') + th('Tuyến') + th('Cước thuê xe', 1) + th('Chi phí hoàn trả đối tác') + th('Đã tạm ứng', 1) + th('Phát sinh', 1) + th('Phải trả', 1);
    return base + th('Booking / Bill') + th('Số cont / Loại') + th('Tuyến') + th('Cước vận chuyển', 1) + th('Chi hộ') + th('Phát sinh', 1) + th('Phải thu', 1);
}

function showSettlementVoucherModal(v, opts = {}) {
    currentSettleVoucher = v;
    const readonly = !!opts.readonly;
    document.getElementById('settle-voucher-modal')?.remove();
    const draft = v.status === 'DRAFT' && !readonly;
    const party = v.party_type;
    const body = v.lines.map((l, i) => settleLineRow(party, l, i, draft)).join('');

    const modal = document.createElement('div');
    modal.id = 'settle-voucher-modal';
    modal.className = 'fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-3';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div>
                    <h3 class="font-bold text-slate-900 font-heading">Bảng Kê Quyết Toán ${SETTLE_PARTY_LABEL[party]} - <span class="font-mono">${escapeHtml(v.code)}</span></h3>
                    <p class="text-xs text-slate-500">Đối tượng: <strong>${escapeHtml(v.party_name)}</strong> · ${v.lines.length} chuyến ·
                        <span class="font-bold ${draft ? 'text-amber-700' : 'text-emerald-700'}">${escapeHtml(v.status_label)}</span>
                        ${v.cash_transaction_code ? ` · Phiếu ${v.direction === 'RECEIVE' ? 'thu' : 'chi'}: <strong>${escapeHtml(v.cash_transaction_code)}</strong>` : ''}</p>
                </div>
                <button type="button" onclick="closeSettleVoucherModal()" class="text-slate-500 hover:text-rose-600"><i class="ph-bold ph-x text-lg"></i></button>
            </div>
            <div class="overflow-auto p-3 text-xs">
                <table class="w-full text-xs border-collapse" id="settle-voucher-table" data-no-col-manager data-no-toolbar>
                    <thead class="bg-slate-50 text-slate-700 font-bold"><tr>${settleHeadCols(party)}</tr></thead>
                    <tbody>${body}</tbody>
                    <tfoot><tr class="bg-slate-50 font-black"><td colspan="20" class="px-2 py-2 text-right font-mono text-sm"><span id="settle-total-amount"></span></td></tr></tfoot>
                </table>
                <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="md:col-span-2"><label class="font-bold text-slate-700">Ghi chú</label>
                        <input id="settle-voucher-notes" type="text" value="${escapeHtml(v.notes || '')}" ${draft ? '' : 'disabled'}
                            class="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded-lg disabled:bg-slate-50"></div>
                    <div class="p-2 rounded-lg border border-slate-200 bg-slate-50">
                        <label class="flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" id="settle-voucher-cash" ${v.with_cash ? 'checked' : ''} ${draft ? '' : 'disabled'}>
                            Phát sinh phiếu ${v.direction === 'RECEIVE' ? 'Thu' : 'Chi'} khi duyệt</label>
                        <select id="settle-voucher-method" ${draft ? '' : 'disabled'} class="mt-1.5 w-full px-2 py-1 border border-slate-300 rounded-lg font-bold">
                            <option value="BANK" ${v.payment_method === 'BANK' ? 'selected' : ''}>Chuyển khoản</option>
                            <option value="CASH" ${v.payment_method === 'CASH' ? 'selected' : ''}>Tiền mặt</option></select>
                    </div>
                </div>
                <p class="mt-2 text-[11px] text-slate-500">Bảng kê chỉ hiển thị thông tin liên quan đến ${SETTLE_PARTY_LABEL[party].toLowerCase()}. Chỉ người có quyền Kế toán/Hành chính mới nhập phát sinh, duyệt, mở lại hoặc xóa phiếu.</p>
            </div>
            <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 flex-wrap">
                <button type="button" onclick="printSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"><i class="ph-bold ph-printer"></i> In bảng kê</button>
                ${draft ? `
                <button type="button" data-voucher-action onclick="deleteSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-rose-300 font-bold text-rose-700 hover:bg-rose-50"><i class="ph-bold ph-trash"></i> Xóa</button>
                <button type="button" data-voucher-action onclick="saveSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-teal-600 font-bold text-teal-800 hover:bg-teal-50"><i class="ph-bold ph-floppy-disk"></i> Lưu</button>
                <button type="button" data-voucher-action onclick="approveSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold"><i class="ph-bold ph-seal-check"></i> Duyệt phiếu</button>`
                : `<button type="button" data-voucher-action onclick="reopenSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"><i class="ph-bold ph-lock-key-open"></i> Mở lại để sửa</button>`}
            </div>
        </div>`;
    if (readonly) modal.querySelectorAll('[data-voucher-action]').forEach(el => el.remove());
    document.body.appendChild(modal);
    recalcSettleVoucher();
}

function closeSettleVoucherModal() {
    document.getElementById('settle-voucher-modal')?.remove();
    currentSettleVoucher = null;
    if (typeof loadSettlementData === 'function' && document.getElementById('page-settle-tbody')) loadSettlementData();
    if (typeof loadSubcontractorData === 'function' && document.getElementById('subcon-select-all')) loadSubcontractorData();
    if (typeof loadCustomerSettlementsData === 'function' && document.getElementById('cust-settle-tbody')) loadCustomerSettlementsData();
    if (document.getElementById('voucher-tab-tbody') && !document.getElementById('subtab-acct-vouchers')?.classList.contains('hidden')) loadVoucherTab();
    if (typeof loadAccountingData === 'function' && document.getElementById('subtab-acct-settlements') && !document.getElementById('subtab-acct-settlements').classList.contains('hidden')) loadAccountingData();
}

function onSettleSplitInput(inp) {
    let r = parseFloat(inp.value);
    if (isNaN(r)) r = 50;
    r = Math.min(100, Math.max(0, r));
    const el = document.getElementById(`settle-split2-${inp.getAttribute('data-split-trip')}`);
    if (el) el.innerText = `${100 - r}%`;
}

function recalcSettleVoucher() {
    const v = currentSettleVoucher;
    if (!v) return;
    let net = 0;
    v.lines.forEach(l => {
        const adj = parseInt(document.querySelector(`[data-adjust-trip="${l.trip_id}"]`)?.value || '0', 10) || 0;
        const t = settleVoucherTotal(v.party_type, l, adj);
        net += t;
        const cell = document.querySelector(`[data-line-total="${l.trip_id}"]`);
        if (cell) {
            cell.innerText = formatMoneyVND(t);
            cell.classList.toggle('text-rose-700', v.party_type === 'DRIVER' && t < 0);
            cell.classList.toggle('text-blue-700', v.party_type === 'DRIVER' && t > 0);
        }
    });
    const amt = document.getElementById('settle-total-amount');
    let text;
    if (v.party_type === 'DRIVER') text = net > 0 ? `TÀI XẾ NỘP LẠI: ${formatMoneyVND(net)}` : (net < 0 ? `CÔNG TY CHI BÙ: ${formatMoneyVND(-net)}` : 'CÂN BẰNG: 0');
    else text = `${v.party_type === 'PARTNER' ? 'TỔNG PHẢI TRẢ' : 'TỔNG PHẢI THU'}: ${formatMoneyVND(net)}`;
    if (amt) amt.innerText = text;
}

function collectSettleVoucherForm() {
    const split_ratios = {};
    document.querySelectorAll('[data-split-trip]').forEach(i => { split_ratios[i.getAttribute('data-split-trip')] = parseFloat(i.value) || 50; });
    const adjustments = {};
    document.querySelectorAll('[data-adjust-trip]').forEach(i => { adjustments[i.getAttribute('data-adjust-trip')] = parseInt(i.value || '0', 10) || 0; });
    return {
        split_ratios, adjustments,
        notes: document.getElementById('settle-voucher-notes')?.value || '',
        with_cash: !!document.getElementById('settle-voucher-cash')?.checked,
        payment_method: document.getElementById('settle-voucher-method')?.value || 'BANK',
    };
}

async function settleVoucherRequest(url, method, body, okMsg) {
    try {
        const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || data.detail || 'Thao tác không thành công');
        if (okMsg) showToast('success', data.message || okMsg, 'Thành công');
        return data;
    } catch (err) {
        showToast('danger', err.message || 'Lỗi kết nối máy chủ', 'Lỗi');
        return null;
    }
}

async function saveSettleVoucher(silent = false) {
    const v = currentSettleVoucher;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/`, 'PUT', collectSettleVoucherForm(), silent ? '' : 'Đã lưu phiếu quyết toán');
    if (data) showSettlementVoucherModal(data.voucher);
    return data;
}

async function approveSettleVoucher() {
    const v = currentSettleVoucher;
    const saved = await saveSettleVoucher(true);
    if (!saved) return;
    const ok = await showConfirmModal({
        title: 'Duyệt Phiếu Quyết Toán',
        message: `Duyệt phiếu ${v.code}? Các chuyến sẽ được khóa sổ${document.getElementById('settle-voucher-cash')?.checked ? ' và tự động lập phiếu Thu/Chi' : ''}. Cần sửa thì dùng "Mở lại để sửa".`,
        confirmText: 'Duyệt phiếu', cancelText: 'Huỷ bỏ', type: 'success', icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/approve/`, 'POST', {
        with_cash: saved.voucher.with_cash, payment_method: saved.voucher.payment_method }, 'Đã duyệt phiếu');
    if (data) {
        showSettlementVoucherModal(data.voucher);
        if (typeof loadAccountingData === 'function') loadAccountingData();
    }
}

async function reopenSettleVoucher() {
    const v = currentSettleVoucher;
    const ok = await showConfirmModal({
        title: 'Mở Lại Phiếu Quyết Toán',
        message: `Mở lại phiếu ${v.code}? Các chuyến sẽ được mở khóa${v.cash_transaction_code ? ` và phiếu ${v.cash_transaction_code} trong Sổ quỹ sẽ bị xóa` : ''}.`,
        confirmText: 'Mở lại', cancelText: 'Huỷ bỏ', type: 'warning', icon: 'ph-bold ph-lock-key-open text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/reopen/`, 'POST', {}, 'Đã mở lại phiếu');
    if (data) showSettlementVoucherModal(data.voucher);
}

async function deleteSettleVoucher() {
    const v = currentSettleVoucher;
    const ok = await showConfirmModal({
        title: 'Xóa Phiếu Quyết Toán', message: `Xóa phiếu ${v.code}? Các chuyến sẽ được trả về trạng thái chờ quyết toán.`,
        confirmText: 'Xóa phiếu', cancelText: 'Huỷ bỏ', type: 'danger', icon: 'ph-bold ph-trash text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/`, 'DELETE', null, 'Đã xóa phiếu');
    if (data) closeSettleVoucherModal();
}

function printSettleVoucher() {
    const v = currentSettleVoucher;
    const table = document.getElementById('settle-voucher-table');
    if (!v || !table) return;
    const clone = table.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp => {
        const span = document.createElement('span');
        span.textContent = inp.value + (inp.hasAttribute('data-split-trip') ? '%' : '');
        inp.replaceWith(span);
    });
    const w = window.open('', '_blank');
    if (!w) { showToast('warning', 'Trình duyệt đang chặn cửa sổ in', 'Không thể in'); return; }
    w.document.write(`<html><head><title>${escapeHtml(v.code)}</title><style>
        body{font-family:Arial,sans-serif;font-size:11px;padding:16px}table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #94a3b8;padding:4px 6px;vertical-align:top}th{background:#f1f5f9}.r{text-align:right}</style></head>
        <body><h2 style="text-align:center;margin-bottom:4px">BẢNG KÊ QUYẾT TOÁN ${SETTLE_PARTY_LABEL[v.party_type].toUpperCase()}</h2>
        <p style="text-align:center;margin-top:0">Số: ${escapeHtml(v.code)} · Đối tượng: <b>${escapeHtml(v.party_name)}</b> · Ngày lập: ${escapeHtml(v.created_at)}</p>
        ${clone.outerHTML}${v.notes ? `<p>Ghi chú: ${escapeHtml(v.notes)}</p>` : ''}
        <table style="margin-top:30px;border:none"><tr style="text-align:center"><td style="border:none">Người lập</td><td style="border:none">Kế toán trưởng</td><td style="border:none">Xác nhận của ${SETTLE_PARTY_LABEL[v.party_type].toLowerCase()}</td></tr></table>
        </body></html>`);
    w.document.close();
    w.focus();
    w.print();
}

// Tab "Phiếu quyết toán" trong phân hệ Kế toán: danh sách phiếu + thao tác (mở để sửa/duyệt/mở lại/xóa/in)
let voucherTabCache = [];

async function loadVoucherTab() {
    const tb = document.getElementById('voucher-tab-tbody');
    if (!tb) return;
    const party = document.getElementById('voucher-filter-party')?.value || '';
    const st = document.getElementById('voucher-filter-status')?.value || '';
    const qs = [party && `party_type=${party}`, st && `status=${st}`].filter(Boolean).join('&');
    try {
        const res = await fetchWithAuth(`${SETTLE_VOUCHER_API}${qs ? '?' + qs : ''}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || 'Không tải được danh sách phiếu');
        voucherTabCache = data.vouchers || [];
        renderVoucherTab();
    } catch (err) {
        tb.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-rose-600 font-bold">${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderVoucherTab() {
    const tb = document.getElementById('voucher-tab-tbody');
    if (!tb) return;
    const q = (document.getElementById('voucher-filter-search')?.value || '').trim().toLowerCase();
    const list = voucherTabCache.filter(v => !q || `${v.code} ${v.party_name}`.toLowerCase().includes(q));
    tb.innerHTML = list.map(v => `<tr class="cursor-pointer hover:bg-slate-50" onclick="openSettlementVoucher(${v.id})">
        <td data-col-key="code" class="font-mono font-bold text-teal-800">${escapeHtml(v.code)}</td>
        <td data-col-key="party">${escapeHtml(v.party_type_label)}</td><td data-col-key="name">${escapeHtml(v.party_name)}</td>
        <td data-col-key="trips" class="text-center">${v.trips_count}</td>
        <td data-col-key="amount" class="text-right font-mono font-bold">${formatMoneyVND(v.amount)}</td>
        <td data-col-key="direction">${v.direction === 'RECEIVE' ? '<span class="text-blue-700 font-bold">Thu</span>' : '<span class="text-rose-700 font-bold">Chi</span>'}</td>
        <td data-col-key="status"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">${escapeHtml(v.status_label)}</span></td>
        <td data-col-key="date">${escapeHtml(v.created_at)}</td></tr>`).join('')
        || '<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">Chưa có phiếu quyết toán</td></tr>';
}

// Danh sách phiếu quyết toán dạng cửa sổ (xem lại, mở để sửa/duyệt/xóa/in)
async function openSettlementVoucherList(partyType = '') {
    document.getElementById('settle-voucher-list-modal')?.remove();
    const res = await fetchWithAuth(`${SETTLE_VOUCHER_API}${partyType ? `?party_type=${partyType}` : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { showToast('danger', data.error || data.detail || 'Không tải được danh sách phiếu', 'Lỗi'); return; }
    const rows = (data.vouchers || []).map(v => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="openSettlementVoucher(${v.id})">
            <td class="px-2 py-2 font-mono font-bold">${escapeHtml(v.code)}</td><td class="px-2 py-2">${escapeHtml(v.party_type_label)}</td>
            <td class="px-2 py-2">${escapeHtml(v.party_name)}</td><td class="px-2 py-2 text-center">${v.trips_count}</td>
            <td class="px-2 py-2 text-right font-mono">${formatMoneyVND(v.amount)}</td>
            <td class="px-2 py-2">${escapeHtml(v.status_label)}</td><td class="px-2 py-2">${escapeHtml(v.created_at)}</td></tr>`).join('')
        || '<tr><td colspan="7" class="text-center py-8 text-slate-400">Chưa có phiếu quyết toán</td></tr>';
    const tab = (p, t) => `<button type="button" onclick="openSettlementVoucherList('${p}')" class="px-3 py-1 rounded-lg text-xs font-bold ${partyType === p ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}">${t}</button>`;
    const modal = document.createElement('div');
    modal.id = 'settle-voucher-list-modal';
    modal.className = 'fixed inset-0 z-[999] bg-slate-900/60 flex items-center justify-center p-3';
    modal.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200"><h3 class="font-bold font-heading">Phiếu Quyết Toán</h3>
            <button type="button" onclick="document.getElementById('settle-voucher-list-modal').remove()"><i class="ph-bold ph-x text-lg"></i></button></div>
        <div class="flex gap-2 px-4 py-2">${tab('', 'Tất cả')}${tab('DRIVER', 'Tài xế')}${tab('PARTNER', 'Đối tác 3PL')}${tab('CUSTOMER', 'Khách hàng')}</div>
        <div class="overflow-auto px-4 pb-4"><table class="w-full text-xs" data-no-col-manager data-no-toolbar><thead class="bg-slate-50 font-bold"><tr>
            <th class="px-2 py-2 text-left">Số phiếu</th><th class="px-2 py-2 text-left">Đối tượng</th><th class="px-2 py-2 text-left">Tên</th>
            <th class="px-2 py-2">Số chuyến</th><th class="px-2 py-2 text-right">Số tiền</th><th class="px-2 py-2 text-left">Tình trạng</th><th class="px-2 py-2 text-left">Ngày lập</th>
        </tr></thead><tbody>${rows}</tbody></table></div></div>`;
    document.body.appendChild(modal);
}

window.openSettlementStatement = openSettlementStatement;
window.openSettlementVoucher = openSettlementVoucher;
window.openSettlementVoucherList = openSettlementVoucherList;
window.loadVoucherTab = loadVoucherTab;
window.renderVoucherTab = renderVoucherTab;
window.closeSettleVoucherModal = closeSettleVoucherModal;
window.onSettleSplitInput = onSettleSplitInput;
window.recalcSettleVoucher = recalcSettleVoucher;
window.saveSettleVoucher = saveSettleVoucher;
window.approveSettleVoucher = approveSettleVoucher;
window.reopenSettleVoucher = reopenSettleVoucher;
window.deleteSettleVoucher = deleteSettleVoucher;
window.printSettleVoucher = printSettleVoucher;
