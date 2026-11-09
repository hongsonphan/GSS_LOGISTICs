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
        if (!res.ok && data.existing_vouchers && data.existing_vouchers.length) {
            // Chuyến đã nằm trong phiếu khác (thường là phiếu nháp lập trước đó): đề nghị mở phiếu đó
            const ex = data.existing_vouchers[0];
            const open = await showConfirmModal({
                title: 'Chuyến đã có phiếu quyết toán',
                message: `${data.error}. Mở phiếu ${ex.code} để xem, sửa hoặc xóa?`,
                confirmText: 'Mở phiếu', cancelText: 'Đóng', type: 'warning', icon: 'ph-bold ph-files text-2xl'
            });
            if (open) openSettlementVoucher(ex.id);
            return;
        }
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

// Bảng kê quyết toán dạng bảng tính (Excel): mỗi chuyến chiếm một khối dòng, các khoản tạm ứng / chi phí xếp từng dòng
const SETTLE_TD = 'border border-slate-300 px-2 py-1 align-top';
const SETTLE_TH = 'border border-slate-300 px-2 py-1.5 bg-slate-100 text-slate-800 font-bold text-center whitespace-nowrap';

function settleHeadCols(party, anySplit) {
    const th = (t, o = {}) => `<th class="${SETTLE_TH}" ${o.cs ? `colspan="${o.cs}"` : ''} ${o.rs ? `rowspan="${o.rs}"` : ''}>${t}</th>`;
    const lead = th('STT', { rs: 2 }) + th('Mã chuyến', { rs: 2 }) + th('Số cont / Loại', { rs: 2 }) + th('Tuyến', { rs: 2 });
    if (party === 'DRIVER') {
        return `<tr>${lead}${th('Tài xế / Xe', { rs: 2 })}${th('Tạm ứng', { cs: 3 })}${th('Chi phí phát sinh', { cs: 5 })}
            ${th('Tổng tạm ứng', { rs: 2 })}${th('Thực chi', { rs: 2 })}${th('Trừ lương TX', { rs: 2 })}${th('Phát sinh KT', { rs: 2 })}${th('Lý do phát sinh', { rs: 2 })}${anySplit ? th('Tỷ lệ thù lao cắt kéo', { rs: 2 }) : ''}${th('Chênh lệch', { rs: 2 })}</tr>
            <tr>${th('Mã phiếu')}${th('Nguồn tiền')}${th('Số tiền')}${th('Khoản mục')}${th('Chặng')}${th('Loại chi')}${th('Trừ lương')}${th('Số tiền')}</tr>`;
    }
    if (party === 'PARTNER') {
        return `<tr>${lead}${th('Xe / Tài xế', { rs: 2 })}${th('Cước thuê xe', { rs: 2 })}${th('Chi phí hoàn trả đối tác', { cs: 3 })}
            ${th('Đã tạm ứng', { rs: 2 })}${th('Phát sinh KT', { rs: 2 })}${th('Lý do phát sinh', { rs: 2 })}${th('Phải trả', { rs: 2 })}</tr>
            <tr>${th('Khoản mục')}${th('Chặng')}${th('Số tiền')}</tr>`;
    }
    return `<tr>${lead}${th('Booking / Bill', { rs: 2 })}${th('Cước vận chuyển', { rs: 2 })}${th('Chi hộ khách hàng', { cs: 2 })}
        ${th('Phát sinh KT', { rs: 2 })}${th('Lý do phát sinh', { rs: 2 })}${th('Phải thu', { rs: 2 })}</tr>
        <tr>${th('Khoản mục')}${th('Số tiền')}</tr>`;
}

// Một chuyến = nhiều dòng của bảng: dòng đầu mang thông tin chuyến và tổng, các dòng sau chỉ thêm khoản tạm ứng / chi phí
function settleLineRow(party, l, i, editable) {
    const num = (v) => `<td class="${SETTLE_TD} text-right tabular-nums font-mono">${formatMoneyVND(v)}</td>`;
    const exps = l.expense_lines || [];
    const advs = party === 'DRIVER' ? (l.advance_lines || []) : [];
    const n = Math.max(1, exps.length, advs.length);
    const rs = (html, cls = '') => `<td rowspan="${n}" class="${SETTLE_TD} ${cls}">${html}</td>`;
    const adjInput = `<input type="text" inputmode="numeric" value="${formatSignedVN(l.adjustment || 0)}" ${editable ? '' : 'disabled'} data-adjust-trip="${l.trip_id}"
        oninput="onSettleAdjustInput(this)" class="w-28 px-1.5 py-1 text-right font-mono font-bold border border-amber-300 rounded bg-amber-50 disabled:bg-transparent disabled:border-transparent"
        title="Số phát sinh do Kế toán/Hành chính nhập (+ cộng thêm, - trừ bớt)">`;
    const noteInput = `<input type="text" maxlength="255" value="${escapeHtml(l.adjustment_note || '')}" ${editable ? '' : 'disabled'} data-adjust-note-trip="${l.trip_id}"
        placeholder="Lý do (bắt buộc nếu có phát sinh)" class="w-52 px-1.5 py-1 border border-amber-300 rounded bg-amber-50 disabled:bg-transparent disabled:border-transparent">`;
    const lead = rs(i + 1, 'text-center') + rs(`<b>${escapeHtml(l.trip_code)}</b><div class="text-[10px] text-slate-500">${escapeHtml(l.date)}</div>`, 'whitespace-nowrap')
        + rs(`${escapeHtml(l.container_number)}<div class="text-[10px] text-slate-500">${escapeHtml(l.container_type)}</div>`, 'whitespace-nowrap')
        + rs(escapeHtml(l.route), 'min-w-[170px]');
    const total = rs('', 'text-right tabular-nums font-mono font-bold whitespace-nowrap').replace('<td ', `<td data-line-total="${l.trip_id}" `);
    // Ô tích "Trừ lương tài xế": khoản chi này tài xế tự chịu, trừ vào lương thay vì công ty chịu
    const deductCell = (e) => `<td class="${SETTLE_TD} text-center"><input type="checkbox" data-deduct-expense="${e.id}" data-deduct-trip="${l.trip_id}" data-deduct-amount="${e.amount}"
        ${e.company_borne === false ? 'checked' : ''} ${editable ? '' : 'disabled'} onchange="recalcSettleVoucher()" class="w-4 h-4 cursor-pointer" title="Tích nếu khoản này trừ vào lương tài xế"></td>`;
    const expCells = (e, withLeg, withPayer) => e
        ? `<td class="${SETTLE_TD}">${escapeHtml(e.name)}${e.invoice ? `<div class="text-[10px] text-slate-500 font-mono">${escapeHtml(e.invoice)}</div>` : ''}</td>`
          + (withLeg ? `<td class="${SETTLE_TD}">${escapeHtml(e.leg || '')}</td>` : '')
          + (withPayer ? `<td class="${SETTLE_TD}">${escapeHtml(e.payer || '')}</td>${deductCell(e)}` : '')
          + num(e.amount)
        : `<td class="${SETTLE_TD}"></td>${withLeg ? `<td class="${SETTLE_TD}"></td>` : ''}${withPayer ? `<td class="${SETTLE_TD}"></td><td class="${SETTLE_TD}"></td>` : ''}<td class="${SETTLE_TD}"></td>`;

    let tail, mid;
    if (party === 'DRIVER') {
        const split = l.is_split_trip ? `<div class="p-1 rounded border-2 border-rose-400 bg-rose-50 text-[11px] font-bold text-rose-800">
                <div class="text-[10px] font-black">CẮT KÉO - KIỂM TRA TỶ LỆ</div>
                <div class="flex items-center gap-1"><span class="truncate max-w-[90px]">${escapeHtml(l.driver_name)}</span>
                <input type="number" min="0" max="100" step="1" value="${l.split_ratio}" ${editable ? '' : 'disabled'} data-split-trip="${l.trip_id}" oninput="onSettleSplitInput(this)"
                    class="w-12 px-1 py-0.5 text-center font-black border border-rose-400 rounded bg-white">%
                <span>/</span><span class="truncate max-w-[90px]">${escapeHtml(l.dropoff_driver_name || 'Chưa gán tài 2')}</span>
                <span class="font-black" id="settle-split2-${l.trip_id}">${100 - l.split_ratio}%</span></div></div>` : '';
        mid = rs(`${escapeHtml(l.driver_name)}<div class="text-[10px] text-slate-500">${escapeHtml(l.license_plate)}</div>`, 'whitespace-nowrap');
        tail = rs(formatMoneyVND(l.advance), 'text-right tabular-nums font-mono') + rs(formatMoneyVND(l.spent), 'text-right tabular-nums font-mono')
            + rs('', 'text-right tabular-nums font-mono').replace('<td ', `<td data-line-deduct="${l.trip_id}" `)
            + rs(adjInput) + rs(noteInput) + (settleAnySplit ? rs(split) : '') + total;
    } else if (party === 'PARTNER') {
        mid = rs(`${escapeHtml(l.license_plate)}<div class="text-[10px] text-slate-500">${escapeHtml(l.driver_name)}</div>`, 'whitespace-nowrap') + rs(formatMoneyVND(l.freight_cost), 'text-right tabular-nums font-mono');
        tail = rs(formatMoneyVND(l.advance), 'text-right tabular-nums font-mono') + rs(adjInput) + rs(noteInput) + total;
    } else {
        mid = rs(escapeHtml(l.booking_or_bill)) + rs(formatMoneyVND(l.freight), 'text-right tabular-nums font-mono');
        tail = rs(adjInput) + rs(noteInput) + total;
    }

    let html = '';
    for (let r = 0; r < n; r++) {
        let cells = '';
        if (party === 'DRIVER') {
            const a = advs[r];
            cells = (a ? `<td class="${SETTLE_TD} font-mono">${escapeHtml(a.code)}</td><td class="${SETTLE_TD}">${escapeHtml(a.source)}</td>${num(a.amount)}`
                       : `<td class="${SETTLE_TD}"></td><td class="${SETTLE_TD}"></td><td class="${SETTLE_TD}"></td>`) + expCells(exps[r], true, true);
        } else if (party === 'PARTNER') {
            cells = expCells(exps[r], true, false);
        } else {
            cells = expCells(exps[r], false, false);
        }
        html += `<tr class="${r === 0 ? '' : ''}">${r === 0 ? lead + mid : ''}${cells}${r === 0 ? tail : ''}</tr>`;
    }
    return html;
}

let settleAnySplit = false;

// Bảng kê quyết toán dạng bảng tính toàn màn hình: chỉ gồm bảng, ghi chú/thanh toán, thao tác và lịch sử thu gọn
function showSettlementVoucherModal(v, opts = {}) {
    currentSettleVoucher = v;
    const readonly = !!opts.readonly;
    const draft = v.status === 'DRAFT' && !readonly;
    const isNew = draft && !v.reconciled;          // mới tạo: chưa bấm Lưu đối soát
    const reconciling = draft && !!v.reconciled;   // đã lưu đối soát, chờ đối tượng xác nhận rồi Duyệt
    const approved = v.status === 'APPROVED' && !readonly;
    const settled = v.status === 'SETTLED' && !readonly;
    const cashEditable = draft || approved;
    const hasPay = (v.payments || []).length > 0;
    const party = v.party_type;
    settleAnySplit = party === 'DRIVER' && v.lines.some(l => l.is_split_trip);
    const body = v.lines.map((l, i) => settleLineRow(party, l, i, draft)).join('');

    const activeView = document.querySelector('.view:not(.hidden-view)');
    if (activeView && activeView.id !== 'view-settlement-voucher') {
        settleVoucherOrigin = activeView.id.replace('view-', '');
    }
    const root = document.getElementById('settle-page-root');
    if (!root) return;
    const inBatch = settleBatch.find(b => b.id === v.id);
    if (inBatch) inBatch.status = v.status;
    const batchBar = settleBatch.length > 1 ? `
        <div class="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2 flex-wrap text-xs no-print">
            <span class="font-bold text-slate-600 px-2">${settleBatch.length} phiếu trong lần chọn này:</span>
            ${settleBatch.map(b => `<button type="button" onclick="openSettlementVoucher(${b.id})" class="px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${b.id === v.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                ${escapeHtml(b.name)} · ${escapeHtml(b.code)}${b.status === 'APPROVED' || b.status === 'SETTLED' ? ' ✓' : ''}</button>`).join('')}
        </div>` : '';
    // Dòng tổng: số cột đứng trước cột "Tổng tạm ứng" / "Cước" thay đổi theo đối tượng
    const footLead = party === 'DRIVER' ? 13 : (party === 'PARTNER' ? 9 : 8);
    const foot = party === 'DRIVER'
        ? `<td class="${SETTLE_TD} text-right font-mono" id="settle-foot-advance"></td><td class="${SETTLE_TD} text-right font-mono" id="settle-foot-spent"></td>
           <td class="${SETTLE_TD} text-right font-mono" id="settle-foot-deduct"></td><td class="${SETTLE_TD} text-right font-mono" id="settle-foot-adj"></td><td class="${SETTLE_TD}"></td>${settleAnySplit ? `<td class="${SETTLE_TD}"></td>` : ''}`
        : (party === 'PARTNER'
            ? `<td class="${SETTLE_TD} text-right font-mono" id="settle-foot-advance"></td><td class="${SETTLE_TD} text-right font-mono" id="settle-foot-adj"></td><td class="${SETTLE_TD}"></td>`
            : `<td class="${SETTLE_TD} text-right font-mono" id="settle-foot-adj"></td><td class="${SETTLE_TD}"></td>`);
    root.innerHTML = `${batchBar}
        <div class="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
            <div class="flex items-center gap-3 flex-wrap">
                <button type="button" onclick="closeSettleVoucherModal()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 font-heading border border-slate-200 cursor-pointer">
                    <i class="ph-bold ph-arrow-left"></i><span>Quay lại</span></button>
                <div>
                    <h3 class="font-bold text-sm sm:text-base font-heading text-slate-900">Bảng kê quyết toán ${SETTLE_PARTY_LABEL[party].toLowerCase()} - <span class="font-mono">${escapeHtml(v.code)}</span></h3>
                    <p class="text-xs text-slate-500">Đối tượng: <strong>${escapeHtml(v.party_name)}</strong> · ${v.lines.length} chuyến · Lập ${escapeHtml(v.created_at)} ·
                        <span class="font-bold ${isNew ? 'text-slate-600' : v.status === 'DRAFT' ? 'text-amber-700' : (v.status === 'APPROVED' ? 'text-sky-700' : 'text-emerald-700')}">${escapeHtml(v.status_label)}</span>
                        ${v.cash_transaction_code ? ` · Phiếu ${v.direction === 'RECEIVE' ? 'thu' : 'chi'}: <strong>${escapeHtml(v.cash_transaction_code)}</strong>` : ''}</p>
                </div>
            </div>
            ${settleStepper(v.status, v.reconciled)}
            <button type="button" onclick="printSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"><i class="ph-bold ph-printer"></i> In bảng kê</button>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 overflow-auto text-xs" style="max-height:calc(100vh - 290px)">
            <table class="w-full text-xs border-collapse" id="settle-voucher-table" data-no-col-manager data-no-toolbar>
                <thead class="sticky top-0 z-10">${settleHeadCols(party, settleAnySplit)}</thead>
                <tbody>${body}</tbody>
                <tfoot>
                    <tr class="bg-slate-50 font-black"><td colspan="${footLead}" class="${SETTLE_TD} text-right">TỔNG CỘNG</td>${foot}<td class="${SETTLE_TD} text-right font-mono" id="settle-foot-total"></td></tr>
                    <tr class="bg-slate-100 font-black"><td colspan="40" class="px-2 py-2 text-right font-mono text-sm"><span id="settle-total-amount"></span></td></tr>
                </tfoot>
            </table>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3 text-xs no-print">
            <label class="font-bold text-slate-700">Ghi chú</label>
            <input id="settle-voucher-notes" type="text" value="${escapeHtml(v.notes || '')}" ${draft ? '' : 'disabled'}
                class="flex-1 min-w-[220px] px-2.5 py-1.5 border border-slate-300 rounded-lg disabled:bg-slate-50">
            ${isNew ? `<div class="basis-full text-slate-600">Bấm <b>Lưu đối soát</b> để chuyển sang trạng thái "Đối soát", sau đó <b>In bảng kê</b> gửi ${SETTLE_PARTY_LABEL[party].toLowerCase()} xác nhận.</div>`
            : reconciling ? `<label class="flex items-center gap-2 font-bold text-slate-800 basis-full"><input type="checkbox" id="settle-confirm-cb" ${v.counterparty_confirmed ? 'checked' : ''}>
                    ${SETTLE_PARTY_LABEL[party]} đã xác nhận bảng kê đối soát</label>
                <input id="settle-confirm-note" type="text" maxlength="255" value="${escapeHtml(v.counterparty_confirm_note || '')}" placeholder="Ai xác nhận, bằng hình thức nào (email, ký tay...)"
                    class="flex-1 min-w-[260px] px-2.5 py-1.5 border border-slate-300 rounded-lg">`
                : `<div class="basis-full text-slate-700"><b class="${v.counterparty_confirmed ? 'text-emerald-700' : 'text-rose-700'}">${v.counterparty_confirmed ? '✓ Đối tượng đã xác nhận' : 'Chưa có xác nhận của đối tượng'}</b>
                    ${v.counterparty_confirmed_at ? ` · ${escapeHtml(v.counterparty_confirmed_at)}` : ''}${v.counterparty_confirm_note ? ` · ${escapeHtml(v.counterparty_confirm_note)}` : ''}</div>`}
            ${(approved || settled) ? settlePaymentPanel(v, approved) : ''}
            <label class="flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" id="settle-voucher-cash" ${v.with_cash ? 'checked' : ''} ${cashEditable ? '' : 'disabled'}>
                Phát sinh phiếu ${v.direction === 'RECEIVE' ? 'Thu' : 'Chi'} khi quyết toán</label>
            <select id="settle-voucher-method" ${cashEditable ? '' : 'disabled'} class="px-2 py-1 border border-slate-300 rounded-lg font-bold">
                <option value="BANK" ${v.payment_method === 'BANK' ? 'selected' : ''}>Chuyển khoản</option>
                <option value="CASH" ${v.payment_method === 'CASH' ? 'selected' : ''}>Tiền mặt</option></select>
            <div class="flex items-center gap-2 ml-auto">
            ${isNew ? `
            <button type="button" data-voucher-action onclick="deleteSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-rose-300 font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"><i class="ph-bold ph-trash"></i> Xóa</button>
            <button type="button" data-voucher-action onclick="reconcileSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"><i class="ph-bold ph-floppy-disk"></i> Lưu đối soát</button>`
            : reconciling ? `
            <button type="button" data-voucher-action onclick="deleteSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-rose-300 font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"><i class="ph-bold ph-trash"></i> Xóa</button>
            <button type="button" data-voucher-action onclick="saveSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-teal-600 font-bold text-teal-800 hover:bg-teal-50 cursor-pointer"><i class="ph-bold ph-floppy-disk"></i> Lưu thay đổi</button>
            <button type="button" data-voucher-action onclick="approveSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"><i class="ph-bold ph-seal-check"></i> Duyệt</button>`
            : ((approved || settled) ? `<input id="settle-reopen-reason" data-voucher-action type="text" maxlength="255" placeholder="${hasPay ? 'Lý do hủy quyết toán' : 'Lý do mở lại đối soát'} (bắt buộc)" class="w-64 px-2.5 py-1.5 border border-slate-300 rounded-lg">
            ${hasPay
                ? `<button type="button" data-voucher-action onclick="unsettleSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"><i class="ph-bold ph-arrow-counter-clockwise"></i> Hủy quyết toán</button>`
                : `<button type="button" data-voucher-action onclick="reopenSettleVoucher()" class="px-3 py-1.5 rounded-lg border border-amber-500 font-bold text-amber-800 hover:bg-amber-50 cursor-pointer"><i class="ph-bold ph-lock-key-open"></i> Mở lại đối soát</button>`}` : '')}
            </div>
        </div>
        ${(v.logs || []).length ? `<div class="bg-white rounded-xl border border-slate-200 px-3 py-2 text-xs no-print">${settleLogSection(v, false)}</div>` : ''}`;
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

// Bước 3 - Quyết toán: các lần thu/chi hoặc cấn trừ đã ghi nhận và ô nhập lần thanh toán mới
function settlePaymentPanel(v, canPay) {
    const rows = (v.payments || []).map(p => `<tr>
        <td class="${SETTLE_TD}">${escapeHtml(p.date)}</td><td class="${SETTLE_TD}">${escapeHtml(p.kind_label)}${p.offset_code ? ` <b>${escapeHtml(p.offset_code)}</b>` : ''}</td>
        <td class="${SETTLE_TD}">${escapeHtml(p.method)}</td><td class="${SETTLE_TD} font-mono">${p.cash_codes.map(escapeHtml).join(', ')}</td>
        <td class="${SETTLE_TD} text-right font-mono font-bold">${formatMoneyVND(p.amount)}</td><td class="${SETTLE_TD}">${escapeHtml(p.note)}</td></tr>`).join('')
        || `<tr><td colspan="6" class="${SETTLE_TD} text-slate-400 italic">Chưa ghi nhận lần thanh toán nào</td></tr>`;
    const total = formatMoneyVND(v.amount);
    return `<div class="basis-full border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50/60">
        <div class="font-bold text-slate-800">Quyết toán: đã thanh toán / cấn trừ <span class="font-mono text-emerald-700">${formatMoneyVND(v.settled_amount || 0)}</span> / ${total}
            · còn lại <span class="font-mono ${v.remaining_amount > 0 ? 'text-amber-700' : 'text-emerald-700'}">${formatMoneyVND(v.remaining_amount || 0)}</span></div>
        <table class="w-full border-collapse text-[11px]"><thead><tr>${['Ngày', 'Hình thức', 'Phương thức', 'Phiếu thu/chi', 'Số tiền', 'Ghi chú'].map(t => `<th class="${SETTLE_TH}">${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
        ${canPay ? `<div class="flex flex-wrap items-center gap-2" data-voucher-action>
            <input id="settle-pay-amount" type="text" inputmode="numeric" value="${formatSignedVN(v.remaining_amount || 0)}" oninput="this.value = formatSignedVN(this.value).replace('-', '')"
                class="w-36 px-2 py-1.5 text-right font-mono font-bold border border-emerald-400 rounded-lg" title="Số tiền thanh toán lần này">
            <input id="settle-pay-note" type="text" maxlength="255" placeholder="Ghi chú (số UNC, diễn giải...)" class="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-300 rounded-lg">
            <button type="button" onclick="settleSettleVoucher()" class="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"><i class="ph-bold ph-handshake"></i> Quyết toán</button>
            <button type="button" onclick="openSettleOffset()" class="px-3 py-1.5 rounded-lg border border-emerald-600 font-bold text-emerald-800 hover:bg-emerald-50 cursor-pointer"><i class="ph-bold ph-arrows-left-right"></i> Cấn trừ với phiếu khác</button>
        </div>` : ''}
    </div>`;
}

// Cấn trừ với phiếu ngược chiều của cùng đối tượng
async function openSettleOffset() {
    const v = currentSettleVoucher;
    const res = await fetchWithAuth(`${SETTLE_VOUCHER_API}${v.id}/offset/`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) { showToast('danger', data.error || 'Không tải được danh sách phiếu cấn trừ', 'Lỗi'); return; }
    if (!data.candidates.length) {
        showToast('info', 'Không có phiếu đã duyệt, ngược chiều thu/chi của cùng đối tượng để cấn trừ', 'Không có phiếu cấn trừ');
        return;
    }
    document.getElementById('settle-offset-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'settle-offset-modal';
    modal.className = 'fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-3';
    modal.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 space-y-3 text-xs">
        <h3 class="font-bold text-sm font-heading">Cấn trừ phiếu ${escapeHtml(v.code)} (còn ${formatMoneyVND(v.remaining_amount)})</h3>
        <p class="text-slate-500">Chọn phiếu ngược chiều của ${escapeHtml(v.party_name)}. Số cấn trừ tối đa là số còn lại nhỏ hơn của hai phiếu; không phát sinh phiếu thu/chi.</p>
        ${data.candidates.map(c => {
            const limit = Math.min(c.remaining, v.remaining_amount);
            return `<div class="flex items-center justify-between gap-2 p-2 border border-slate-200 rounded-lg">
                <div><b class="font-mono">${escapeHtml(c.code)}</b> · ${c.direction === 'RECEIVE' ? 'Thu' : 'Chi'} ${formatMoneyVND(c.amount)} · còn ${formatMoneyVND(c.remaining)}</div>
                <button type="button" onclick="doSettleOffset(${c.id}, ${limit})" class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer">Cấn trừ ${formatMoneyVND(limit)}</button></div>`;
        }).join('')}
        <div class="text-right"><button type="button" onclick="document.getElementById('settle-offset-modal').remove()" class="px-3 py-1.5 rounded-lg border border-slate-300 font-bold cursor-pointer">Đóng</button></div>
    </div>`;
    document.body.appendChild(modal);
}

async function doSettleOffset(otherId, amount) {
    const v = currentSettleVoucher;
    document.getElementById('settle-offset-modal')?.remove();
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/offset/`, 'POST', { other_voucher_id: otherId, amount }, 'Đã cấn trừ');
    if (data) {
        const fresh = await fetchWithAuth(`${SETTLE_VOUCHER_API}${v.id}/`).then(r => r.json()).catch(() => null);
        showSettlementVoucherModal(fresh && fresh.voucher ? fresh.voucher : data.voucher);
        if (typeof loadAccountingData === 'function') loadAccountingData();
    }
}

// Ba bước: Đối soát -> Duyệt (lên công nợ) -> Quyết toán
function settleStepper(status, reconciled) {
    const idx = status === 'DRAFT' ? (reconciled ? 1 : 0) : ({ APPROVED: 2, SETTLED: 4 }[status] ?? 0);
    const steps = ['Mới tạo', '1. Đối soát', '2. Duyệt (lên công nợ)', '3. Quyết toán'];
    return `<div class="flex items-center gap-1.5 text-[11px] font-bold no-print">${steps.map((t, i) =>
        `<span class="px-2.5 py-1 rounded-full border ${i < idx ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : (i === idx ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-400 border-slate-200')}">${i < idx ? '✓ ' : ''}${t}</span>`
    ).join('<span class="text-slate-300">➔</span>')}</div>`;
}

function settleLogValue(v) {
    if (v === null || v === undefined || v === '') return '<span class="text-slate-400">trống</span>';
    if (typeof v === 'number') return formatMoneyVND(v);
    if (typeof v === 'boolean') return v ? 'Có' : 'Không';
    return escapeHtml(String(v));
}

function settleLogSection(v, open = false) {
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
    return `<details class="mt-3 border border-slate-200 rounded-lg" ${open ? 'open' : ''}>
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

// Số nguyên có dấu (+/-) hiển thị dấu phân cách hàng nghìn kiểu Việt Nam: -1.234.000
function formatSignedVN(val) {
    const str = String(val === null || val === undefined ? '' : val);
    const digits = str.replace(/\D/g, '');
    if (!digits) return str.trim() === '-' ? '-' : '0';
    return (str.trim().startsWith('-') ? '-' : '') + new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

function parseSignedVN(val) {
    const str = String(val === null || val === undefined ? '' : val);
    const n = parseInt(str.replace(/\D/g, ''), 10) || 0;
    return str.trim().startsWith('-') ? -n : n;
}

function onSettleAdjustInput(inp) {
    const f = formatSignedVN(inp.value);
    if (inp.value !== f && !(inp.value.trim() === '-' && f === '-')) inp.value = f;
    recalcSettleVoucher();
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
        const adj = parseSignedVN(document.querySelector(`[data-adjust-trip="${l.trip_id}"]`)?.value);
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
    // Tổng khoản trừ lương tài xế theo các ô đã tích (không đổi số tiền mặt hoàn ứng, chỉ ghi nhận để trừ lương)
    let deductTotal = 0;
    v.lines.forEach(l => {
        let d = 0;
        document.querySelectorAll(`[data-deduct-trip="${l.trip_id}"]:checked`).forEach(cb => { d += parseInt(cb.getAttribute('data-deduct-amount'), 10) || 0; });
        deductTotal += d;
        const cell = document.querySelector(`[data-line-deduct="${l.trip_id}"]`);
        if (cell) cell.innerText = d ? formatMoneyVND(d) : '';
    });
    const amt = document.getElementById('settle-total-amount');
    let text;
    if (v.party_type === 'DRIVER') text = net > 0 ? `TÀI XẾ NỘP LẠI: ${formatMoneyVND(net)}` : (net < 0 ? `CÔNG TY CHI BÙ: ${formatMoneyVND(-net)}` : 'CÂN BẰNG: 0');
    else text = `${v.party_type === 'PARTNER' ? 'TỔNG PHẢI TRẢ' : 'TỔNG PHẢI THU'}: ${formatMoneyVND(net)}`;
    if (v.party_type === 'DRIVER' && deductTotal > 0) text += `  ·  TRỪ LƯƠNG TÀI XẾ: ${formatMoneyVND(deductTotal)}`;
    if (amt) amt.innerText = text;
    const setFoot = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = formatMoneyVND(val); };
    setFoot('settle-foot-advance', v.lines.reduce((s, l) => s + (l.advance || 0), 0));
    setFoot('settle-foot-spent', v.lines.reduce((s, l) => s + (l.spent || 0), 0));
    setFoot('settle-foot-adj', adjTotal);
    if (document.getElementById('settle-foot-deduct')) document.getElementById('settle-foot-deduct').innerText = deductTotal ? formatMoneyVND(deductTotal) : '';
    setFoot('settle-foot-total', net);
}

function collectSettleVoucherForm() {
    const split_ratios = {};
    document.querySelectorAll('[data-split-trip]').forEach(i => { split_ratios[i.getAttribute('data-split-trip')] = parseFloat(i.value) || 50; });
    const adjustments = {};
    document.querySelectorAll('[data-adjust-trip]').forEach(i => { adjustments[i.getAttribute('data-adjust-trip')] = parseSignedVN(i.value); });
    const adjustment_notes = {};
    document.querySelectorAll('[data-adjust-note-trip]').forEach(i => { adjustment_notes[i.getAttribute('data-adjust-note-trip')] = i.value.trim(); });
    const salary_deductions = {};
    document.querySelectorAll('[data-deduct-expense]').forEach(cb => { salary_deductions[cb.getAttribute('data-deduct-expense')] = cb.checked; });
    const confirmCb = document.getElementById('settle-confirm-cb');
    return {
        split_ratios, adjustments, adjustment_notes, salary_deductions,
        ...(confirmCb ? { counterparty_confirmed: confirmCb.checked, counterparty_confirm_note: document.getElementById('settle-confirm-note')?.value || '' } : {}),
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

// Mới tạo -> Đối soát: lưu bảng kê, chuyển trạng thái, chuyến sang "Đối soát"; sau đó in gửi đối tượng
async function reconcileSettleVoucher() {
    const v = currentSettleVoucher;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/`, 'PUT', { ...collectSettleVoucherForm(), reconcile: true },
        'Đã lưu đối soát. In bảng kê gửi đối tượng xác nhận rồi bấm Duyệt');
    if (data) {
        showSettlementVoucherModal(data.voucher);
        if (typeof loadAccountingData === 'function') loadAccountingData();
    }
}

async function approveSettleVoucher() {
    const v = currentSettleVoucher;
    if (!document.getElementById('settle-confirm-cb')?.checked) {
        showToast('warning', `Cần ${SETTLE_PARTY_LABEL[v.party_type].toLowerCase()} xác nhận bảng kê đối soát (tích ô xác nhận, ghi rõ ai xác nhận) trước khi duyệt`, 'Chưa có xác nhận');
        document.getElementById('settle-confirm-cb')?.focus();
        return;
    }
    const saved = await saveSettleVoucher(true);
    if (!saved) return;
    const ok = await showConfirmModal({
        title: 'Duyệt',
        message: `Duyệt phiếu ${v.code}? Số liệu được chốt và lên công nợ, các chuyến bị khóa sổ. Chưa phát sinh tiền: thu/chi thực tế làm ở bước Quyết toán. Cần sửa thì "Mở lại đối soát".`,
        confirmText: 'Duyệt', cancelText: 'Huỷ bỏ', type: 'success', icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/approve/`, 'POST', {
        with_cash: saved.voucher.with_cash, payment_method: saved.voucher.payment_method }, 'Đã duyệt phiếu');
    if (data) {
        showSettlementVoucherModal(data.voucher);
        if (typeof loadAccountingData === 'function') loadAccountingData();
    }
}

async function settleSettleVoucher() {
    const v = currentSettleVoucher;
    const withCash = !!document.getElementById('settle-voucher-cash')?.checked;
    const amount = parseNumberVN(document.getElementById('settle-pay-amount')?.value);
    if (v.amount > 0 && (amount <= 0 || amount > v.remaining_amount)) {
        showToast('warning', `Số tiền thanh toán phải lớn hơn 0 và không vượt số còn lại (${formatMoneyVND(v.remaining_amount)})`, 'Số tiền không hợp lệ');
        document.getElementById('settle-pay-amount')?.focus();
        return;
    }
    const ok = await showConfirmModal({
        title: 'Quyết Toán',
        message: `Quyết toán ${formatMoneyVND(amount)} cho phiếu ${v.code}?${withCash ? ` Hệ thống lập phiếu ${v.direction === 'RECEIVE' ? 'Thu' : 'Chi'} (mã có đuôi .ĐS) vào Sổ quỹ${v.party_type === 'CUSTOMER' ? ' (tách thu cước và thu hồi chi hộ)' : ''}.` : ' Không lập phiếu thu/chi (đã thanh toán ngoài hệ thống).'} Khi đủ số tiền phiếu thành "Đã quyết toán" và tạm ứng tài xế được đóng.`,
        confirmText: 'Quyết toán', cancelText: 'Huỷ bỏ', type: 'success', icon: 'ph-bold ph-handshake text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/settle/`, 'POST', {
        amount, with_cash: withCash, payment_method: document.getElementById('settle-voucher-method')?.value || 'BANK',
        note: document.getElementById('settle-pay-note')?.value || '' }, 'Đã quyết toán');
    if (data) {
        const fresh = await fetchWithAuth(`${SETTLE_VOUCHER_API}${v.id}/`).then(r => r.json()).catch(() => null);
        showSettlementVoucherModal(fresh && fresh.voucher ? fresh.voucher : data.voucher);
        if (typeof loadAccountingData === 'function') loadAccountingData();
    }
}

async function unsettleSettleVoucher() {
    const v = currentSettleVoucher;
    const reason = (document.getElementById('settle-reopen-reason')?.value || '').trim();
    if (!reason) {
        showToast('warning', 'Nhập lý do hủy quyết toán để lưu vết', 'Thiếu lý do');
        document.getElementById('settle-reopen-reason')?.focus();
        return;
    }
    const ok = await showConfirmModal({
        title: 'Hủy Quyết Toán',
        message: `Hủy toàn bộ thanh toán / cấn trừ của phiếu ${v.code}? Phiếu quay về "Đã duyệt"; các phiếu thu/chi đã lập bị hủy và tạm ứng được mở lại.`,
        confirmText: 'Hủy quyết toán', cancelText: 'Giữ nguyên', type: 'warning', icon: 'ph-bold ph-arrow-counter-clockwise text-2xl'
    });
    if (!ok) return;
    const data = await settleVoucherRequest(`${SETTLE_VOUCHER_API}${v.id}/unsettle/`, 'POST', { reason }, 'Đã hủy quyết toán');
    if (data) showSettlementVoucherModal(data.voucher);
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
        title: 'Mở Lại Đối Soát',
        message: `Mở lại đối soát phiếu ${v.code}? Các chuyến được mở khóa, phiếu rút khỏi công nợ và cần đối tượng xác nhận lại.`,
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
        span.textContent = inp.type === 'checkbox' ? (inp.checked ? '✓' : '') : inp.value + (inp.hasAttribute('data-split-trip') ? '%' : '');
        inp.replaceWith(span);
    });
    const party = SETTLE_PARTY_LABEL[v.party_type];
    const co = typeof getSystemCompanyProfile === 'function' ? getSystemCompanyProfile() : {};
    // Kỳ quyết toán lấy theo ngày chạy sớm nhất và muộn nhất của các chuyến trong phiếu
    const toTime = (d) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : null; };
    const dated = v.lines.filter(l => toTime(l.date) !== null).sort((a, b) => toTime(a.date) - toTime(b.date));
    const fromDate = dated.length ? dated[0].date : '....../....../........';
    const toDate = dated.length ? dated[dated.length - 1].date : '....../....../........';
    const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v.created_at || '');
    const createdText = m ? `Ngày ${m[1]} tháng ${m[2]} năm ${m[3]}` : '';
    const w = window.open('', '_blank');
    if (!w) { showToast('warning', 'Trình duyệt đang chặn cửa sổ in', 'Không thể in'); return; }
    w.document.write(`<html><head><title>${escapeHtml(v.code)}</title><style>
        @page{size:A4 landscape;margin:10mm}
        body{font-family:Arial,sans-serif;font-size:11px;padding:8px}table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #94a3b8;padding:4px 6px;vertical-align:top}th{background:#f1f5f9}.r{text-align:right}
        .head{display:flex;align-items:center;gap:12px;border-bottom:1px solid #94a3b8;padding-bottom:8px;margin-bottom:8px}
        .head img{height:52px;width:auto}.head .co{font-size:12px}.head .co b{font-size:13px;text-transform:uppercase}
        .sign td{border:none;text-align:center;width:25%}</style></head>
        <body>
        <div class="head"><img src="${location.origin}/static/images/gss_logo.svg" alt="">
            <div class="co"><b>${escapeHtml(co.company_name || '')}</b><br>${escapeHtml(co.address || '')}<br>MST: ${escapeHtml(co.tax_code || '')} · ĐT: ${escapeHtml(co.phone || '')}</div></div>
        <h2 style="text-align:center;margin:6px 0 2px">BẢNG KÊ QUYẾT TOÁN ${party.toUpperCase()}</h2>
        <p style="text-align:center;margin:0 0 2px">Từ ngày ${escapeHtml(fromDate)} đến ngày ${escapeHtml(toDate)}</p>
        <p style="text-align:center;margin:0 0 8px">Số: ${escapeHtml(v.code)} · Đối tượng: <b>${escapeHtml(v.party_name)}</b></p>
        ${clone.outerHTML}${v.notes ? `<p>Ghi chú: ${escapeHtml(v.notes)}</p>` : ''}
        <p style="text-align:right;margin:18px 40px 4px;font-style:italic">${escapeHtml(createdText)}</p>
        <table class="sign" style="border:none"><tr style="font-weight:bold"><td>Người lập</td><td>Kế toán</td><td>Giám đốc</td><td>Xác nhận của ${party.toLowerCase()}</td></tr>
            <tr><td style="height:70px"></td><td></td><td></td><td></td></tr></table>
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
        <td data-col-key="status"><span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : (v.status === 'APPROVED' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-amber-50 text-amber-800 border border-amber-200')}">${escapeHtml(v.status_label)}</span></td>
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
window.onSettleAdjustInput = onSettleAdjustInput;
window.recalcSettleVoucher = recalcSettleVoucher;
window.saveSettleVoucher = saveSettleVoucher;
window.reconcileSettleVoucher = reconcileSettleVoucher;
window.approveSettleVoucher = approveSettleVoucher;
window.settleSettleVoucher = settleSettleVoucher;
window.openSettleOffset = openSettleOffset;
window.doSettleOffset = doSettleOffset;
window.unsettleSettleVoucher = unsettleSettleVoucher;
window.reopenSettleVoucher = reopenSettleVoucher;
window.deleteSettleVoucher = deleteSettleVoucher;
window.printSettleVoucher = printSettleVoucher;
