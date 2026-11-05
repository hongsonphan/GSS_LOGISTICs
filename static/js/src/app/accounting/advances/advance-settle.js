// =============================================================================
// =============================================================================
// -------------------------------------------------------------
// GSS ACCOUNTING ADVANCE & SETTLEMENT CONTROLLERS
// -------------------------------------------------------------
let currentActiveAdvance = null;

function closeDriverAdvanceModal() {
    const modal = document.getElementById('modal-driver-advance');
    if (modal) modal.classList.add('hidden');
}

function onAdvanceTripChange() {
    const tripSelect = document.getElementById('adv-inp-trip');
    if (!tripSelect) return;
    const selectedOption = tripSelect.options[tripSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        const info = document.getElementById('adv-trip-info');
        if (info) info.classList.add('hidden');
        return;
    }

    const driverId = selectedOption.getAttribute('data-driver');
    const plate = selectedOption.getAttribute('data-plate');
    const route = selectedOption.getAttribute('data-route');

    if (driverId) {
        const drvSelect = document.getElementById('adv-inp-driver');
        if (drvSelect) drvSelect.value = driverId;
    }

    const infoEl = document.getElementById('adv-trip-info');
    if (infoEl) {
        infoEl.innerHTML = `<i class="ph-bold ph-truck"></i> Xe: <strong>${escapeHtml(plate || '')}</strong> | Tuyến: ${escapeHtml(route || '')}`;
        infoEl.classList.remove('hidden');
    }
}

function toggleAdvanceSourceType() {
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value;
    const boxFund = document.getElementById('adv-box-dispatcher-fund');
    if (!boxFund) return;
    if (sourceVal === 'DISPATCHER_FUND') {
        boxFund.classList.remove('hidden');
    } else {
        boxFund.classList.add('hidden');
    }
}

async function submitDriverAdvanceForm(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const tripId = document.getElementById('adv-inp-trip')?.value;
    const driverId = document.getElementById('adv-inp-driver')?.value;
    const amountStr = document.getElementById('adv-inp-amount')?.value;
    const advanceDate = document.getElementById('adv-inp-date')?.value;
    const sourceVal = document.querySelector('input[name="adv_source"]:checked')?.value || 'DISPATCHER_FUND';
    const fundId = document.getElementById('adv-inp-fund')?.value;
    const purpose = document.getElementById('adv-inp-purpose')?.value;
    const notes = document.getElementById('adv-inp-notes')?.value;

    const payload = {
        trip_id: tripId,
        driver_id: driverId,
        amount: amountStr,
        advance_date: advanceDate,
        advance_source: sourceVal,
        dispatcher_fund_id: (sourceVal === 'DISPATCHER_FUND' && fundId) ? fundId : null,
        purpose: purpose,
        notes: notes
    };

    try {
        const res = await fetchWithAuth('/api/accounting/driver-advances/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cấp tạm ứng thành công', 'Cấp Tạm Ứng Thành Công');
            closeDriverAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
        } else {
            showToast('danger', data.error || 'Không thể tạo phiếu tạm ứng');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function openSettleAdvanceModal(advanceId) {
    const advance = (rawDriverAdvancesList || []).find(a => a.id === advanceId);
    if (!advance) return;
    currentActiveAdvance = advance;

    const modal = document.getElementById('modal-settle-advance');
    if (!modal) return;

    const idEl = document.getElementById('settle-adv-id');
    if (idEl) idEl.value = advance.id;
    const codeEl = document.getElementById('settle-adv-code');
    if (codeEl) codeEl.innerText = advance.code;
    const tripEl = document.getElementById('settle-adv-trip-info');
    if (tripEl) tripEl.innerText = `${advance.trip_code} - ${advance.customer_name || ''} (${advance.license_plate || ''})`;
    const drvEl = document.getElementById('settle-adv-driver-name');
    if (drvEl) drvEl.innerText = advance.driver_name;
    const amtEl = document.getElementById('settle-adv-amount-display');
    if (amtEl) amtEl.innerText = formatMoneyVND(advance.amount);

    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(advance.actual_spent || advance.amount);
    }

    calculateSettlementDiff();
    modal.classList.remove('hidden');
}

function closeSettleAdvanceModal() {
    const modal = document.getElementById('modal-settle-advance');
    if (modal) modal.classList.add('hidden');
}

function calculateSettlementDiff() {
    if (!currentActiveAdvance) return;
    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const advance = parseInt(currentActiveAdvance.amount, 10) || 0;
    const diff = advance - spent;

    const box = document.getElementById('settle-adv-diff-box');
    const badgeEl = document.getElementById('settle-adv-diff-badge');
    const descEl = document.getElementById('settle-adv-diff-desc');
    const amountEl = document.getElementById('settle-adv-diff-amount');

    if (!box || !badgeEl || !descEl || !amountEl) return;

    if (diff > 0) {
        box.className = 'p-4 rounded-2xl border bg-blue-50/70 border-blue-200 text-blue-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-200 text-blue-900';
        badgeEl.innerText = 'TÀI XẾ HOÀN LẠI TIỀN THỪA';
        descEl.innerText = 'Số tiền tài xế nộp lại vào quỹ:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-blue-800';
        amountEl.innerText = `+${formatMoneyVND(diff)}`;
    } else if (diff < 0) {
        box.className = 'p-4 rounded-2xl border bg-rose-50/70 border-rose-200 text-rose-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-900';
        badgeEl.innerText = 'CÔNG TY CHI TRẢ BÙ';
        descEl.innerText = 'Số tiền công ty/điều vận chi bù cho tài xế:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-rose-700';
        amountEl.innerText = `-${formatMoneyVND(Math.abs(diff))}`;
    } else {
        box.className = 'p-4 rounded-2xl border bg-emerald-50/70 border-emerald-200 text-emerald-900';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-200 text-emerald-900';
        badgeEl.innerText = 'KHỚP ĐÚNG 100%';
        descEl.innerText = 'Không phát sinh chênh lệch:';
        amountEl.className = 'text-xl font-black tabular-nums font-heading text-emerald-800';
        amountEl.innerText = '0 đ';
    }
}

function recalculateActualExpensesFromTrip() {
    if (!currentActiveAdvance) return;
    const spentInp = document.getElementById('settle-adv-actual-spent');
    if (spentInp) {
        spentInp.value = new Intl.NumberFormat('vi-VN').format(currentActiveAdvance.actual_spent);
        calculateSettlementDiff();
    }
}

async function submitSettleAdvanceForm(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!currentActiveAdvance) return;

    const spentStr = document.getElementById('settle-adv-actual-spent')?.value || '0';
    const spent = parseInt(spentStr.replace(/\D/g, ''), 10) || 0;
    const notes = document.getElementById('settle-adv-notes')?.value || '';

    try {
        const res = await fetchWithAuth(`/api/accounting/driver-advances/${currentActiveAdvance.id}/settle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actual_spent: spent,
                settlement_notes: notes
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Quyết toán hoàn ứng thành công', 'Quyết Toán Hoàn Ứng Thành Công');
            closeSettleAdvanceModal();
            if (typeof loadAccountingAdvancesData === 'function') {
                loadAccountingAdvancesData();
            }
            if (data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code) {
                setTimeout(() => {
                    if (typeof openCashVoucherModal === 'function') {
                        openCashVoucherModal(data.cash_transaction || data.cash_transaction_id || data.cash_transaction_code);
                    }
                }, 300);
            }
        } else {
            showToast('danger', data.error || 'Không thể quyết toán');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

window.closeDriverAdvanceModal = closeDriverAdvanceModal;
window.onAdvanceTripChange = onAdvanceTripChange;
window.toggleAdvanceSourceType = toggleAdvanceSourceType;
window.submitDriverAdvanceForm = submitDriverAdvanceForm;
window.openSettleAdvanceModal = openSettleAdvanceModal;
window.closeSettleAdvanceModal = closeSettleAdvanceModal;
window.calculateSettlementDiff = calculateSettlementDiff;
window.recalculateActualExpensesFromTrip = recalculateActualExpensesFromTrip;
window.submitSettleAdvanceForm = submitSettleAdvanceForm;
