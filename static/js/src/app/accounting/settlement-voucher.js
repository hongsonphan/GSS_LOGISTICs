// Phiếu Quyết Toán dùng chung cho Tài xế / Đối tác 3PL / Khách hàng.
// Quy trình: chọn chuyến -> Quyết toán -> Bảng kê rà soát (lưu nháp) -> Duyệt -> (Mở lại) Sửa | Lưu | Xóa | In.
// Mỗi đối tượng chỉ thấy cột liên quan: tài xế/đối tác không thấy giá cước khách hàng, khách hàng không thấy chi phí tài xế/đối tác.
const SETTLE_VOUCHER_API = '/api/accounting/settlement-vouchers/';
const SETTLE_PARTY_LABEL = { DRIVER: 'Tài Xế', PARTNER: 'Đối Tác 3PL', CUSTOMER: 'Khách Hàng' };
let currentSettleVoucher = null;
let settleVoucherOrigin = '';
// Nhiều đối tượng trong một lần chọn: mỗi đối tượng một phiếu, chuyển qua lại ngay trên trang
let settleBatch = [];

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
        settleBatch = made.length > 1 ? made.map(v => ({ id: v.id, code: v.code, name: v.party_name, status: v.status })) : [];
        if (made.length > 1) {
            showToast('success', `Đã lập ${made.length} bảng kê (mỗi ${SETTLE_PARTY_LABEL[partyType].toLowerCase()} một phiếu): ${made.map(v => v.code).join(', ')}`, 'Tách phiếu theo đối tượng');
        }
        showSettlementVoucherModal(data.voucher);
    } catch (err) {
        showToast('danger', err.message || 'Lỗi kết nối máy chủ', 'Lỗi lập bảng kê');
    }
}

async function openSettlementVoucher(id) {
    if (!settleBatch.some(b => b.id === id)) settleBatch = [];
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
        title="Số phát sinh do Kế toán/Hành chính nhập (+ cộng thêm, - trừ bớt)">
        <input type="text" maxlength="255" value="${escapeHtml(l.adjustment_note || '')}" ${editable ? '' : 'disabled'} data-adjust-note-trip="${l.trip_id}"
        placeholder="Lý do phát sinh (bắt buộc)" class="mt-1 w-28 px-1.5 py-1 text-[11px] border border-amber-300 rounded bg-amber-50 disabled:bg-slate-50 disabled:border-slate-200">`;
    const common = `<td class="px-2 py-2 text-center">${i + 1}</td>
        <td class="px-2 py-2 font-bold">${escapeHtml(l.trip_code)}<div class="text-[10px] text-slate-500 font-normal">${escapeHtml(l.date)}</div>
            <button type="button" onclick="toggleSettleDetail(${l.trip_id})" class="mt-1 text-[10px] font-bold text-teal-700 hover:underline cursor-pointer">Chi tiết</button></td>`;
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

// Chi tiết từng chuyến (mở rộng dưới dòng bảng kê): tạm ứng theo từng phiếu, chi phí theo loại người chi
function settleDetailRow(party, l) {
    const advances = (l.advance_lines || []).map(a =>
        `<tr><td class="px-2 py-1 font-mono">${escapeHtml(a.code)}</td><td class="px-2 py-1">${escapeHtml(a.source)}</td>
            <td class="px-2 py-1">${escapeHtml(a.date)}</td><td class="px-2 py-1 text-right font-mono">${formatMoneyVND(a.amount)}</td>
            <td class="px-2 py-1 text-slate-500">${escapeHtml(a.purpose || '')}</td></tr>`).join('');
    const expenses = (l.expense_lines || []).map(e =>
        `<tr><td class="px-2 py-1">${escapeHtml(e.name)}</td><td class="px-2 py-1">${escapeHtml(e.leg || '-')}</td>
            <td class="px-2 py-1">${escapeHtml(e.payer || '')}</td>
            <td class="px-2 py-1">${e.company_borne === false ? 'Trừ lương tài xế' : 'Công ty chịu'}</td>
            <td class="px-2 py-1 font-mono">${escapeHtml(e.invoice || '')}</td><td class="px-2 py-1">${escapeHtml(e.status || '')}</td>
            <td class="px-2 py-1 text-right font-mono">${formatMoneyVND(e.amount)}</td></tr>`).join('');
    const head = (cols) => `<thead class="bg-white text-slate-600"><tr>${cols.map(c => `<th class="px-2 py-1 ${c[1] ? 'text-right' : 'text-left'}">${c[0]}</th>`).join('')}</tr></thead>`;
    const advBlock = party === 'DRIVER' ? `<div><div class="font-bold text-slate-700 mb-1">Tạm ứng theo phiếu</div>
        <table class="w-full border border-slate-200 bg-white">${head([['Mã phiếu'], ['Nguồn tiền'], ['Ngày'], ['Số tiền', 1], ['Mục đích']])}
        <tbody>${advances || '<tr><td colspan="5" class="px-2 py-2 text-slate-400 italic">Không có tạm ứng</td></tr>'}</tbody></table></div>` : '';
    const expTitle = party === 'DRIVER' ? 'Chi phí phát sinh trong chuyến' : (party === 'PARTNER' ? 'Chi phí hoàn trả đối tác' : 'Chi hộ khách hàng');
    return `<tr class="hidden bg-slate-50" data-detail-trip="${l.trip_id}"><td colspan="20" class="px-3 py-3"><div class="grid grid-cols-1 xl:grid-cols-2 gap-3 text-[11px]">
        ${advBlock}
        <div><div class="font-bold text-slate-700 mb-1">${expTitle}</div>
        <table class="w-full border border-slate-200 bg-white">${head([['Khoản mục'], ['Chặng'], ['Loại chi'], ['Bên chịu'], ['Hóa đơn'], ['Trạng thái'], ['Số tiền', 1]])}
        <tbody>${expenses || '<tr><td colspan="7" class="px-2 py-2 text-slate-400 italic">Không có</td></tr>'}</tbody></table></div>
    </div></td></tr>`;
}

function toggleSettleDetail(tripId) {
    document.querySelector(`[data-detail-trip="${tripId}"]`)?.classList.toggle('hidden');
}

function settleCard(title, value, sub, tone) {
    return `<div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-${tone}-500">
        <div class="text-[12px] font-bold text-slate-500 uppercase tracking-wider">${title}</div>
        <div class="text-2xl font-black tabular-nums font-heading mt-1 text-${tone}-700">${value}</div>
        <div class="text-xs text-slate-500 font-medium mt-1">${sub}</div></div>`;
}

// Thẻ tổng hợp phía trên bảng kê: cập nhật theo số phát sinh đang nhập
function renderSettleSummary(v, adjTotal, net) {
    const el = document.getElementById('settle-page-summary');
    if (!el) return;
    const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
    const lines = v.lines;
    const expAll = lines.flatMap(l => l.expense_lines || []);
    let cards;
    if (v.party_type === 'DRIVER') {
        const adv = lines.flatMap(l => l.advance_lines || []);
        const fund = sum(adv.filter(a => a.source_code === 'DISPATCHER_FUND'), a => a.amount);
        const direct = sum(adv.filter(a => a.source_code !== 'DISPATCHER_FUND'), a => a.amount);
        const byPayer = {};
        expAll.forEach(e => { byPayer[e.payer || 'Khác'] = (byPayer[e.payer || 'Khác'] || 0) + e.amount; });
        const payerText = Object.entries(byPayer).map(([k, x]) => `${escapeHtml(k)}: ${formatMoneyVND(x)}`).join(' · ') || 'Không có chi phí';
        cards = settleCard('Tổng tạm ứng', formatMoneyVND(sum(lines, l => l.advance)), `Quỹ điều vận: ${formatMoneyVND(fund)} · Công ty trực tiếp: ${formatMoneyVND(direct)}`, 'amber')
            + settleCard('Tổng chi phí phát sinh', formatMoneyVND(sum(lines, l => l.spent)), payerText, 'teal')
            + settleCard('Phát sinh kế toán', formatMoneyVND(adjTotal), 'Cộng thêm vào chi phí tài xế đã chi', 'sky');
    } else if (v.party_type === 'PARTNER') {
        cards = settleCard('Cước thuê xe', formatMoneyVND(sum(lines, l => l.freight_cost)), `${lines.length} chuyến`, 'teal')
            + settleCard('Chi phí hoàn trả đối tác', formatMoneyVND(sum(expAll, e => e.amount)), 'Các khoản 3PL chi hộ', 'sky')
            + settleCard('Đã tạm ứng', formatMoneyVND(sum(lines, l => l.advance)), 'Trừ vào số phải trả', 'amber');
    } else {
        cards = settleCard('Cước vận chuyển', formatMoneyVND(sum(lines, l => l.freight)), `${lines.length} chuyến`, 'teal')
            + settleCard('Chi hộ khách hàng', formatMoneyVND(sum(expAll, e => e.amount)), 'Chưa gửi Debit Note / chưa thu hồi', 'sky')
            + settleCard('Phát sinh kế toán', formatMoneyVND(adjTotal), 'Điều chỉnh có lý do', 'amber');
    }
    const resultTitle = v.party_type === 'DRIVER' ? (net > 0 ? 'Tài xế nộp lại' : (net < 0 ? 'Công ty chi bù' : 'Cân bằng'))
        : (v.party_type === 'PARTNER' ? (net >= 0 ? 'Phải trả đối tác' : 'Đối tác hoàn lại') : 'Phải thu khách hàng');
    el.innerHTML = cards + settleCard(resultTitle, formatMoneyVND(Math.abs(net)), `${lines.length} chuyến · ${escapeHtml(v.party_name)}`, 'emerald');
}

// Màn hình riêng của phiếu quyết toán (thay cho cửa sổ nổi): xem, hiệu chỉnh, duyệt, in và xem lịch sử thay đổi
function showSettlementVoucherModal(v, opts = {}) {
    currentSettleVoucher = v;
    const readonly = !!opts.readonly;
    const draft = v.status === 'DRAFT' && !readonly;
    const party = v.party_type;
    const body = v.lines.map((l, i) => settleLineRow(party, l, i, draft) + settleDetailRow(party, l)).join('');

    const activeView = document.querySelector('.view:not(.hidden-view)');
    if (activeView && activeView.id !== 'view-settlement-voucher') {
        settleVoucherOrigin = activeView.id.replace('view-', '');
    }
    const root = document.getElementById('settle-page-root');
    if (!root) return;
    const inBatch = settleBatch.find(b => b.id === v.id);
    if (inBatch) inBatch.status = v.status;
    const batchBar = settleBatch.length > 1 ? `
        <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 flex-wrap text-xs no-print">
            <span class="font-bold text-slate-600 px-2">${settleBatch.length} phiếu trong lần chọn này:</span>
            ${settleBatch.map(b => `<button type="button" onclick="openSettlementVoucher(${b.id})" class="px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${b.id === v.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                ${escapeHtml(b.name)} · ${escapeHtml(b.code)}${b.status === 'APPROVED' ? ' ✓' : ''}</button>`).join('')}
        </div>` : '';
    root.innerHTML = `${batchBar}
        <div class="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div class="flex items-center gap-3 flex-wrap">
                <button type="button" onclick="closeSettleVoucherModal()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 font-heading border border-slate-200 cursor-pointer">
                    <i class="ph-bold ph-arrow-left"></i><span>Quay lại</span></button>
                <div>
                    <h3 class="font-bold text-sm sm:text-base font-heading text-slate-900">Quyết Toán ${SETTLE_PARTY_LABEL[party]} - <span class="font-mono">${escapeHtml(v.code)}</span></h3>
                    <p class="text-xs text-slate-500">Đối tượng: <strong>${escapeHtml(v.party_name)}</strong> · ${v.lines.length} chuyến · Lập ${escapeHtml(v.created_at)} ·
                        <span class="font-bold ${draft ? 'text-amber-700' : 'text-emerald-700'}">${escapeHtml(v.status_label)}</span>
                        ${v.cash_transaction_code ? ` · Phiếu ${v.direction === 'RECEIVE' ? 'thu' : 'chi'}: <strong>${escapeHtml(v.cash_transaction_code)}</strong>` : ''}</p>
                </div>
            </div>
            <button type="button" onclick="printSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"><i class="ph-bold ph-printer"></i> In bảng kê</button>
        </div>
        <div id="settle-page-summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print"></div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 overflow-auto text-xs">
            <table class="w-full text-xs border-collapse" id="settle-voucher-table" data-no-col-manager data-no-toolbar>
                <thead class="bg-slate-50 text-slate-700 font-bold"><tr>${settleHeadCols(party)}</tr></thead>
                <tbody>${body}</tbody>
                <tfoot><tr class="bg-slate-50 font-black"><td colspan="20" class="px-2 py-2 text-right font-mono text-sm"><span id="settle-total-amount"></span></td></tr></tfoot>
            </table>
            <p class="mt-2 text-[11px] text-slate-500">Bấm "Chi tiết" ở từng chuyến để xem từng phiếu tạm ứng và từng khoản chi phí. Bảng kê chỉ hiển thị thông tin liên quan đến ${SETTLE_PARTY_LABEL[party].toLowerCase()}.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs no-print">
            <div class="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-3"><label class="font-bold text-slate-700">Ghi chú</label>
                <input id="settle-voucher-notes" type="text" value="${escapeHtml(v.notes || '')}" ${draft ? '' : 'disabled'}
                    class="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded-lg disabled:bg-slate-50"></div>
            <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
                <label class="flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" id="settle-voucher-cash" ${v.with_cash ? 'checked' : ''} ${draft ? '' : 'disabled'}>
                    Phát sinh phiếu ${v.direction === 'RECEIVE' ? 'Thu' : 'Chi'} khi duyệt</label>
                <select id="settle-voucher-method" ${draft ? '' : 'disabled'} class="mt-1.5 w-full px-2 py-1 border border-slate-300 rounded-lg font-bold">
                    <option value="BANK" ${v.payment_method === 'BANK' ? 'selected' : ''}>Chuyển khoản</option>
                    <option value="CASH" ${v.payment_method === 'CASH' ? 'selected' : ''}>Tiền mặt</option></select>
            </div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 text-xs no-print">${settleLogSection(v) || '<span class="text-slate-400">Chưa có lịch sử thay đổi</span>'}</div>
        <div class="flex items-center justify-end gap-2 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-xs no-print">
            ${draft ? `
            <button type="button" data-voucher-action onclick="deleteSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-rose-300 font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"><i class="ph-bold ph-trash"></i> Xóa</button>
            <button type="button" data-voucher-action onclick="saveSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-teal-600 font-bold text-teal-800 hover:bg-teal-50 cursor-pointer"><i class="ph-bold ph-floppy-disk"></i> Lưu</button>
            <button type="button" data-voucher-action onclick="approveSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"><i class="ph-bold ph-seal-check"></i> Duyệt phiếu</button>`
            : `<input id="settle-reopen-reason" data-voucher-action type="text" maxlength="255" placeholder="Lý do mở lại (bắt buộc)" class="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-300 rounded-lg">
            <button type="button" data-voucher-action onclick="reopenSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"><i class="ph-bold ph-lock-key-open"></i> Mở lại để sửa</button>`}
        </div>`;
    if (readonly) root.querySelectorAll('[data-voucher-action]').forEach(el => el.remove());

    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
    document.getElementById('view-settlement-voucher').classList.remove('hidden-view');
    if (typeof setTopbarFullpageMode === 'function') {
        setTopbarFullpageMode({
            backFn: closeSettleVoucherModal,
            prefix: settleVoucherOrigin === 'ke-toan' ? 'Tài chính & Kế toán' : 'Quyết toán',
            title: `Quyết Toán ${SETTLE_PARTY_LABEL[party]} | ${v.code}`,
        });
    }
    recalcSettleVoucher();
}

function settleLogValue(v) {
    if (v === null || v === undefined || v === '') return '<span class="text-slate-400">trống</span>';
    if (typeof v === 'number') return formatMoneyVND(v);
    if (typeof v === 'boolean') return v ? 'Có' : 'Không';
    return escapeHtml(String(v));
}

function settleLogSection(v) {
    const logs = v.logs || [];
    if (!logs.length) return '';
    const items = logs.slice().reverse().map(g => {
        const changes = (g.changes || []).map(c =>
            `<li>${c.trip_code ? `<span class="font-mono font-bold">${escapeHtml(c.trip_code)}</span> · ` : ''}${escapeHtml(c.field)}: ${settleLogValue(c.old)} ➔ <strong>${settleLogValue(c.new)}</strong></li>`).join('');
        return `<div class="py-1.5 border-b border-slate-100 last:border-0">
            <div class="flex flex-wrap items-center gap-x-2"><strong class="text-slate-800">${escapeHtml(g.action_label)}</strong>
                <span class="text-slate-500">${escapeHtml(g.actor || 'hệ thống')} · ${escapeHtml(g.at)}</span>
                <span class="font-mono text-slate-600">Số tiền sau: ${formatMoneyVND(g.amount_after)}</span></div>
            ${g.reason ? `<div class="text-slate-600">Lý do: ${escapeHtml(g.reason)}</div>` : ''}
            ${changes ? `<ul class="list-disc pl-5 text-[11px] text-slate-600">${changes}</ul>` : ''}</div>`;
    }).join('');
    return `<details class="mt-3 border border-slate-200 rounded-lg" ${logs.length <= 3 ? 'open' : ''}>
        <summary class="px-3 py-2 font-bold text-slate-700 cursor-pointer">Lịch sử thay đổi (${logs.length})</summary>
        <div class="px-3 pb-2 max-h-56 overflow-auto">${items}</div></details>`;
}

function closeSettleVoucherModal() {
    currentSettleVoucher = null;
    settleBatch = [];
    // Quay về màn hình đã mở phiếu (Kế toán / Quyết toán gom chuyến / Điều vận...)
    const back = settleVoucherOrigin && settleVoucherOrigin !== 'settlement-voucher' ? settleVoucherOrigin : 'ke-toan';
    if (typeof resetTopbarStandardMode === 'function') resetTopbarStandardMode(back);
    if (typeof switchTab === 'function' && document.getElementById(`view-${back}`)) switchTab(back, true);
    else document.getElementById('view-settlement-voucher')?.classList.add('hidden-view');
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
    let adjTotal = 0;
    v.lines.forEach(l => {
        const adj = parseInt(document.querySelector(`[data-adjust-trip="${l.trip_id}"]`)?.value || '0', 10) || 0;
        const t = settleVoucherTotal(v.party_type, l, adj);
        net += t;
        adjTotal += adj;
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
    renderSettleSummary(v, adjTotal, net);
}

function collectSettleVoucherForm() {
    const split_ratios = {};
    document.querySelectorAll('[data-split-trip]').forEach(i => { split_ratios[i.getAttribute('data-split-trip')] = parseFloat(i.value) || 50; });
    const adjustments = {};
    document.querySelectorAll('[data-adjust-trip]').forEach(i => { adjustments[i.getAttribute('data-adjust-trip')] = parseInt(i.value || '0', 10) || 0; });
    const adjustment_notes = {};
    document.querySelectorAll('[data-adjust-note-trip]').forEach(i => { adjustment_notes[i.getAttribute('data-adjust-note-trip')] = i.value.trim(); });
    return {
        split_ratios, adjustments, adjustment_notes,
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
    const reason = (document.getElementById('settle-reopen-reason')?.value || '').trim();
    if (!reason) {
        showToast('warning', 'Nhập lý do mở lại phiếu để lưu vết', 'Thiếu lý do');
        document.getElementById('settle-reopen-reason')?.focus();
        return;
    }
    const ok = await showConfirmModal({
        title: 'Mở Lại Phiếu Quyết Toán',
        message: `Mở lại phiếu ${v.code}? Các chuyến sẽ được mở khóa${v.cash_transaction_code ? ` và phiếu ${v.cash_transaction_code} trong Sổ quỹ sẽ bị xóa` : ''}.`,
        confirmText: 'Mở lại', cancelText: 'Huỷ bỏ', type: 'warning', icon: 'ph-bold ph-lock-key-open text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/reopen/`, 'POST', { reason }, 'Đã mở lại phiếu');
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
    if (!data) return;
    settleBatch = settleBatch.filter(b => b.id !== v.id);
    if (settleBatch.length) openSettlementVoucher(settleBatch[0].id);
    else closeSettleVoucherModal();
}

function printSettleVoucher() {
    const v = currentSettleVoucher;
    const table = document.getElementById('settle-voucher-table');
    if (!v || !table) return;
    const clone = table.cloneNode(true);
    clone.querySelectorAll('[data-detail-trip], button').forEach(el => el.remove());
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
window.toggleSettleDetail = toggleSettleDetail;
window.onSettleSplitInput = onSettleSplitInput;
window.recalcSettleVoucher = recalcSettleVoucher;
window.saveSettleVoucher = saveSettleVoucher;
window.approveSettleVoucher = approveSettleVoucher;
window.reopenSettleVoucher = reopenSettleVoucher;
window.deleteSettleVoucher = deleteSettleVoucher;
window.printSettleVoucher = printSettleVoucher;
