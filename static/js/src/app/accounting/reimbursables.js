// ==============================================================================
// 9.4. SUBTAB 4: ĐỐI SOÁT & THU HỒI CHI HỘ KHÁCH HÀNG (DEBIT NOTE CONTROLLER)
// ==============================================================================
let rawReimbursablesList = [];
let selectedReimbursableIds = new Set();

async function loadReimbursablesData() {
    try {
        const statusFilter = document.getElementById('reimburse-filter-status')?.value || 'ALL';
        const customerId = document.getElementById('reimburse-filter-customer')?.value || '';
        const search = document.getElementById('reimburse-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/reimbursables/?reimbursement_status=${statusFilter}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (customerId) url += `&customer_id=${customerId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải dữ liệu chi hộ');
        const data = await res.json();

        rawReimbursablesList = data.items || [];

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTotal = document.getElementById('reimburse-stat-total');
            if (elTotal) elTotal.innerText = formatMoneyVND(kp.total_amount);

            const elCollected = document.getElementById('reimburse-stat-collected');
            if (elCollected) elCollected.innerText = formatMoneyVND(kp.collected_amount);

            const elPending = document.getElementById('reimburse-stat-pending');
            if (elPending) elPending.innerText = formatMoneyVND(kp.pending_amount);

            const elBilled = document.getElementById('reimburse-stat-billed');
            if (elBilled) elBilled.innerText = formatMoneyVND(kp.billed_amount);

            const elCount = document.getElementById('reimburse-stat-count');
            if (elCount) elCount.innerText = `${kp.total_items_count} khoản chi hộ`;

            const elPCount = document.getElementById('reimburse-stat-pending-count');
            if (elPCount) elPCount.innerText = `${kp.pending_items_count} khoản chờ thu`;

            const badge = document.getElementById('badge-acct-reimbursables');
            if (badge) badge.innerText = kp.pending_items_count;
        }

        // Cập nhật dropdown Khách hàng (nếu chưa có hoặc lần đầu)
        const custSelect = document.getElementById('reimburse-filter-customer');
        if (custSelect && data.by_customer && custSelect.options.length <= 1) {
            data.by_customer.forEach(c => {
                if (c.customer_id) {
                    const opt = document.createElement('option');
                    opt.value = c.customer_id;
                    opt.textContent = `${c.customer_name} (${formatMoneyVND(c.pending_amount)} chờ thu)`;
                    custSelect.appendChild(opt);
                }
            });
        }

        renderReimbursablesTable(rawReimbursablesList);
    } catch (err) {
        console.error('Lỗi tải bảng kê chi hộ:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải bảng kê chi hộ', 'Lỗi Chi Hộ');
    }
}

function renderReimbursablesTable(list) {
    const tbody = document.getElementById('acct-reimburse-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy khoản chi hộ nào phù hợp</td></tr>`;
        updateSelectedReimbursablesUI();
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        const isChecked = selectedReimbursableIds.has(item.id) ? 'checked' : '';
        const isCollected = item.reimbursement_status === 'COLLECTED';
        const isBilled = item.reimbursement_status === 'BILLED';

        let statusBadge = `<span class="text-xs font-bold text-amber-700 uppercase">Chờ Thu</span>`;
        if (isBilled) {
            statusBadge = `<span class="text-xs font-bold text-indigo-700 uppercase">Đã Lập Debit Note</span>`;
        } else if (isCollected) {
            statusBadge = `<span class="text-xs font-bold text-emerald-700 uppercase">Đã Thu Hồi</span>`;
        }

        let invoiceInfo = '<span class="text-slate-400">Không có HĐ</span>';
        if (item.invoice_number) {
            invoiceInfo = `<div class="font-bold text-slate-800">Số: ${escapeHtml(item.invoice_number)}</div>`;
            if (item.invoice_lookup_code) {
                invoiceInfo += `<div class="text-[10px] text-teal-700 font-mono">Tra cứu: ${escapeHtml(item.invoice_lookup_code)}</div>`;
            }
        }

        let dnBadge = item.debit_note_number 
            ? `<span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">${escapeHtml(item.debit_note_number)}</span>`
            : '<span class="text-slate-400 text-xs">-</span>';

        return `
            <tr class="hover:bg-teal-50/30 transition-colors">
                <td class="text-center">
                    <input type="checkbox" value="${item.id}" ${isChecked} onchange="toggleReimbursableCheck(${item.id}, this)" class="rounded text-teal-600 focus:ring-teal-500">
                </td>
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                    ${index + 1}
                </td>
                <td class="whitespace-nowrap">
                    <div class="font-bold text-teal-800 font-mono text-xs">${escapeHtml(formatCodeCompact(item.trip_code))}</div>
                </td>
                <td class="whitespace-nowrap text-center text-[11px] text-slate-600 font-medium">
                    ${escapeHtml(item.created_at || '-')}
                </td>
                <td>
                    <div class="font-bold text-slate-800 max-w-[180px] truncate" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">TX: ${escapeHtml(item.driver_name)} (${escapeHtml(item.vehicle_plate)})</div>
                </td>
                <td>
                    <div class="font-mono font-bold text-slate-700">${escapeHtml(item.container_number || '-')}</div>
                    <div class="text-[11px] text-slate-400">BK: ${escapeHtml(item.booking_or_bill || '-')}</div>
                </td>
                <td>
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ${escapeHtml(item.expense_item_name)}
                    </span>
                    ${item.notes ? `<div class="text-[10px] text-slate-400 italic mt-0.5">${escapeHtml(item.notes)}</div>` : ''}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums text-sm font-heading">
                    ${formatMoneyVND(item.amount)}
                </td>
                <td>${invoiceInfo}</td>
                <td>${dnBadge}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 font-medium">
                    ${item.reimbursed_at ? `<div class="text-emerald-700 font-bold">${item.reimbursed_at}</div><div class="text-[10px] text-slate-400">${escapeHtml(item.reimbursed_by_name)}</div>` : '-'}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        ${!isCollected ? `
                            <button type="button" onclick="settleSingleReimbursement(${item.id})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors" title="Xác nhận khách đã hoàn trả tiền">
                                <i class="ph-bold ph-check text-xs"></i> Thu Tiền
                            </button>
                        ` : `
                            <span class="text-xs text-emerald-600 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Đã Thu</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateSelectedReimbursablesUI();

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalAmount = list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalCollected = list.filter(i => i.reimbursement_status === 'COLLECTED').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalPending = totalAmount - totalCollected;
        window.BimTableFooter.render('accounting-reimburse-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${list.length} khoản chi hộ | Đã thu: <span class="text-emerald-700 font-bold font-mono">${formatMoneyVND(totalCollected)}</span> | Chờ thu: <span class="text-amber-700 font-bold font-mono">${formatMoneyVND(totalPending)}</span>`, colspan: 6 },
                { html: `<span class="text-slate-900 font-black tabular-nums font-mono text-sm">${formatMoneyVND(totalAmount)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 5 }
            ]
        });
    }
}

function toggleReimbursableCheck(id, checkbox) {
    if (checkbox.checked) {
        selectedReimbursableIds.add(id);
    } else {
        selectedReimbursableIds.delete(id);
    }
    updateSelectedReimbursablesUI();
}

function toggleCheckAllReimbursables(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    rawReimbursablesList.forEach(item => {
        if (isChecked) {
            selectedReimbursableIds.add(item.id);
        } else {
            selectedReimbursableIds.delete(item.id);
        }
    });
    renderReimbursablesTable(rawReimbursablesList);
}

function selectAllReimbursables(state) {
    const master = document.getElementById('reimburse-check-all');
    if (master) master.checked = state;
    toggleCheckAllReimbursables({ checked: state });
}

function updateSelectedReimbursablesUI() {
    const count = selectedReimbursableIds.size;
    const badge = document.getElementById('reimburse-selected-badge');
    if (badge) badge.innerText = count;

    const master = document.getElementById('reimburse-check-all');
    if (master) {
        master.checked = count > 0 && count === rawReimbursablesList.length;
    }
}

function openCreateDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn ít nhất 1 khoản chi hộ để gom nhóm lập Debit Note!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'create_debit_note';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    // Tính tổng tiền
    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng: ${Array.from(custNames).join(', ') || 'Nhiều khách hàng'}`;

    // Auto generate DN code
    const now = new Date();
    const dStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const tStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('dn-number').value = `DN-${dStr}-${tStr}`;

    // UI state for create
    document.getElementById('debit-modal-title').innerText = 'Gom Nhóm & Lập Debit Note Chi Hộ';
    document.getElementById('dn-code-container').classList.remove('hidden');
    document.getElementById('dn-settle-fields').classList.add('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Lập Debit Note';

    modal.classList.remove('hidden');
}

function openSettleDebitNoteModal() {
    if (selectedReimbursableIds.size === 0) {
        showToast('warning', 'Vui lòng tích chọn các khoản chi hộ muốn xác nhận khách hàng đã hoàn tiền!');
        return;
    }

    const modal = document.getElementById('modal-debit-note');
    if (!modal) return;

    document.getElementById('dn-action-type').value = 'settle_reimbursement';
    document.getElementById('dn-expense-ids').value = Array.from(selectedReimbursableIds).join(',');

    let totalAmt = 0;
    const custNames = new Set();
    rawReimbursablesList.forEach(item => {
        if (selectedReimbursableIds.has(item.id)) {
            totalAmt += item.amount;
            if (item.customer_name) custNames.add(item.customer_name);
        }
    });

    document.getElementById('dn-selected-count').innerText = `${selectedReimbursableIds.size} khoản chi hộ`;
    document.getElementById('dn-selected-amount').innerText = formatMoneyVND(totalAmt);
    document.getElementById('dn-selected-customer').innerText = `Khách hàng hoàn tiền: ${Array.from(custNames).join(', ')}`;

    // UI state for settle
    document.getElementById('debit-modal-title').innerText = 'Xác Nhận Thu Hồi Chi Hộ (1-Chạm)';
    document.getElementById('dn-code-container').classList.add('hidden');
    document.getElementById('dn-settle-fields').classList.remove('hidden');
    document.getElementById('btn-submit-debit-note-label').innerText = 'Xác Nhận Đã Thu Tiền & Ghi Sổ Quỹ';

    modal.classList.remove('hidden');
}

function closeDebitNoteModal() {
    const modal = document.getElementById('modal-debit-note');
    if (modal) modal.classList.add('hidden');
}

async function handleSaveDebitNote(e) {
    e.preventDefault();
    const actionType = document.getElementById('dn-action-type').value;
    const expIdsStr = document.getElementById('dn-expense-ids').value;
    const expenseIds = expIdsStr ? expIdsStr.split(',').map(Number) : [];
    const dnNumber = document.getElementById('dn-number')?.value || '';
    const paymentMethod = document.getElementById('dn-payment-method')?.value || 'BANK';
    const bankName = document.getElementById('dn-bank-name')?.value || '';
    const notes = document.getElementById('dn-notes')?.value || '';

    try {
        let payload = { action: actionType, expense_ids: expenseIds, notes: notes };
        if (actionType === 'create_debit_note') {
            payload.debit_note_number = dnNumber;
        } else if (actionType === 'settle_reimbursement') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankName;
        }

        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeDebitNoteModal();
            selectedReimbursableIds.clear();
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Thao tác không thành công');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function settleSingleReimbursement(expenseId) {
    const confirmed = await showConfirmModal({
        title: 'Thu Hồi Chi Hộ',
        message: 'Xác nhận Khách hàng đã hoàn tiền cho khoản chi hộ này?\n\nHệ thống sẽ tự động hạch toán Phiếu Thu vào Sổ Quỹ.',
        confirmText: 'Thu Hồi Tiền',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-hand-coins text-2xl'
    });
    if (!confirmed) return;
    try {
        const res = await fetchWithAuth('/api/accounting/reimbursables/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'settle_reimbursement',
                expense_ids: [expenseId],
                payment_method: 'BANK',
                notes: 'Thu hoàn ứng chi hộ trực tiếp'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Đã Thu Tiền Hoàn Ứng');
            loadReimbursablesData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportReimbursablesToExcel() {
    exportAccountingToExcel();
}
