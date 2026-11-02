// ==============================================================================
// 9.6. SUBTAB 6: QUYẾT TOÁN XE BẠN / THẦU PHỤ 3PL (SUBCONTRACTOR CONTROLLER)
// ==============================================================================
let rawSubcontractorList = [];
let subconSortColumn = null;
let subconSortDirection = 'asc';
let selectedSubconTripIds = new Set();

function populateSubcontractorFilterOptions(byPartnerList = []) {
    const sel = document.getElementById('subcon-filter-subcontractor');
    if (!sel) return;

    const currentVal = sel.value;
    const optionsMap = new Map();

    // 1. Lấy từ cache Master Data nếu có
    if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache?.subcontractors) {
        masterDataFormOptionsCache.subcontractors.forEach(s => {
            optionsMap.set(String(s.id), s.label || `[${s.code}] ${s.name}`);
        });
    }

    // 2. Thêm từ đối tác thực tế có chuyến trong kỳ
    if (Array.isArray(byPartnerList)) {
        byPartnerList.forEach(p => {
            if (p.subcontractor_id) {
                const idStr = String(p.subcontractor_id);
                if (!optionsMap.has(idStr)) {
                    optionsMap.set(idStr, `[${p.partner_code}] ${p.partner_name}`);
                }
            }
        });
    }

    sel.innerHTML = '<option value="">-- Tất cả Thầu Phụ / Nhà Xe 3PL --</option>';
    optionsMap.forEach((label, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = label;
        sel.appendChild(opt);
    });

    if (currentVal && optionsMap.has(currentVal)) {
        sel.value = currentVal;
    }
}

function toggleSubconSort(col) {
    if (subconSortColumn === col) {
        subconSortDirection = subconSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        subconSortColumn = col;
        subconSortDirection = 'asc';
    }
    applySubconSortAndRender();
}

function applySubconSortAndRender() {
    if (!rawSubcontractorList || !Array.isArray(rawSubcontractorList)) return;
    let list = [...rawSubcontractorList];

    if (subconSortColumn) {
        list.sort((a, b) => {
            let valA = a[subconSortColumn];
            let valB = b[subconSortColumn];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA == null) valA = '';
            if (valB == null) valB = '';

            if (valA < valB) return subconSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return subconSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Cập nhật icon thead
    const sortCols = [
        'trip_code', 'subcontractor_name', 'driver_name', 'customer_name',
        'cached_revenue', 'subcontractor_cost', 'gross_company_margin',
        'subcontractor_advance', 'remaining_payable', 'subcontractor_settlement_status'
    ];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-subcon-${col}`);
        if (iconEl) {
            if (subconSortColumn === col) {
                iconEl.className = subconSortDirection === 'asc'
                    ? 'ph-bold ph-arrow-up text-emerald-600 text-xs'
                    : 'ph-bold ph-arrow-down text-emerald-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderSubcontractorTable(list);
}

async function loadSubcontractorData() {
    try {
        const status = document.getElementById('subcon-filter-status')?.value || 'ALL';
        const subconId = document.getElementById('subcon-filter-subcontractor')?.value || '';
        const search = document.getElementById('subcon-search')?.value || '';

        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        let url = `/api/accounting/subcontractor-settlements/?status=${status}&from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`;
        if (subconId) url += `&subcontractor_id=${encodeURIComponent(subconId)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không thể tải quyết toán xe bạn');
        const data = await res.json();

        rawSubcontractorList = data.trips || [];

        // Nạp danh sách Thầu phụ vào dropdown lọc
        populateSubcontractorFilterOptions(data.by_partner || []);

        // Cập nhật KPIs
        if (data.kpis) {
            const kp = data.kpis;
            const elTrips = document.getElementById('subcon-stat-trips');
            if (elTrips) elTrips.innerText = `${kp.total_trips} chuyến`;

            const elCost = document.getElementById('subcon-stat-cost');
            if (elCost) elCost.innerText = formatMoneyVND(kp.total_cost);

            const elAdv = document.getElementById('subcon-stat-advance');
            if (elAdv) elAdv.innerText = formatMoneyVND(kp.total_advance);

            const elRem = document.getElementById('subcon-stat-remaining');
            if (elRem) elRem.innerText = formatMoneyVND(kp.total_remaining);

            const elInfo = document.getElementById('subcon-stat-settled-info');
            if (elInfo) elInfo.innerText = `Đã quyết toán: ${kp.settled_count} / ${kp.total_trips} chuyến`;

            const badge = document.getElementById('badge-acct-subcontractors');
            if (badge) badge.innerText = kp.pending_count;

            const badgeFiltered = document.getElementById('subcon-filtered-badge');
            if (badgeFiltered) badgeFiltered.innerText = `Hiển thị: ${rawSubcontractorList.length} chuyến xe bạn`;
        }

        // Bỏ chọn các chuyến không còn tồn tại
        const availableIds = new Set(rawSubcontractorList.map(t => t.trip_id));
        for (const id of selectedSubconTripIds) {
            if (!availableIds.has(id)) selectedSubconTripIds.delete(id);
        }

        applySubconSortAndRender();
        updateBatchSettleButtonState();
    } catch (err) {
        console.error('Lỗi tải quyết toán xe bạn:', err);
        showToast('danger', 'Không thể kết nối máy chủ để tải quyết toán xe bạn', 'Lỗi Thầu Phụ 3PL');
    }
}

function renderSubcontractorTable(list) {
    const tbody = document.getElementById('acct-subcon-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe bạn nào phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((item, index) => {
        const isSettled = item.subcontractor_settlement_status === 'SETTLED';
        const isPartial = item.subcontractor_settlement_status === 'PARTIAL';
        const isChecked = selectedSubconTripIds.has(item.trip_id);

        let statusBadge = `<span class="text-xs font-bold text-rose-700 uppercase">Chờ Quyết Toán</span>`;
        if (isPartial) {
            statusBadge = `<span class="text-xs font-bold text-amber-700 uppercase">Đã Trả Một Phần</span>`;
        } else if (isSettled) {
            statusBadge = `<span class="text-xs font-bold text-emerald-700 uppercase">Đã Quyết Toán</span>`;
        }

        const marginClass = item.gross_company_margin >= 0 ? 'text-teal-700' : 'text-rose-600';
        const chkDisabled = isSettled ? 'disabled title="Chuyến này đã quyết toán xong"' : '';
        const chkClass = isSettled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer';

        return `
            <tr class="hover:bg-slate-50 transition-colors ${isChecked ? 'bg-emerald-50/40' : ''}">
                <td class="w-10 text-center border-r border-slate-200">
                    <input type="checkbox"
                        class="subcon-row-checkbox rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 ${chkClass}"
                        data-trip-id="${item.trip_id}"
                        ${isChecked ? 'checked' : ''}
                        ${chkDisabled}
                        onchange="onSubconTripSelectionChange(${item.trip_id}, this.checked)">
                </td>
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">${index + 1}</td>
                <td>
                    <div class="font-bold text-slate-900 font-heading">${escapeHtml(item.trip_code)}</div>
                    <div class="text-[11px] text-slate-400">${item.created_at}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-900 font-heading text-xs truncate max-w-[170px]" title="${escapeHtml(item.subcontractor_name || 'Xe ngoài')}">${escapeHtml(item.subcontractor_name || 'Xe ngoài')}</div>
                    <div class="text-[11px] font-mono text-slate-500 font-semibold">${escapeHtml(item.vehicle_plate)}</div>
                </td>
                <td>
                    <div class="font-semibold text-slate-800">${escapeHtml(item.driver_name)}</div>
                </td>
                <td>
                    <div class="font-bold text-slate-800 truncate max-w-[160px]" title="${escapeHtml(item.customer_name)}">${escapeHtml(item.customer_name)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(item.route_name)}</div>
                </td>
                <td class="text-right font-bold text-slate-700 tabular-nums">
                    ${formatMoneyVND(item.cached_revenue)}
                </td>
                <td class="text-right font-black text-rose-700 tabular-nums font-heading">
                    ${formatMoneyVND(item.subcontractor_cost)}
                    ${item.sub_reimbursable_expenses > 0 ? `<div class="text-[10px] text-amber-700 font-bold" title="Khoản 3PL chi hộ hoàn trả lại">+ ${formatMoneyVND(item.sub_reimbursable_expenses)} hoàn chi hộ</div>` : ''}
                </td>
                <td class="text-right font-bold tabular-nums ${marginClass}">
                    ${formatMoneyVND(item.gross_company_margin)}
                </td>
                <td class="text-right font-semibold text-amber-700 tabular-nums">
                    ${formatMoneyVND(item.subcontractor_advance)}
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums font-heading text-sm">
                    ${formatMoneyVND(item.remaining_payable)}
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-xs text-slate-500 max-w-[140px] truncate" title="${escapeHtml(item.subcontractor_notes)}">
                    ${escapeHtml(item.subcontractor_notes || '-')}
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <!-- 1. Quyết toán từng chuyến -->
                        ${!isSettled ? `
                            <button type="button" onclick="openSettlementStatement('PARTNER', [${item.trip_id}])" class="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer" title="Quyết toán cước chuyến này">
                                <i class="ph-bold ph-check-circle text-xs"></i><span>Quyết Toán</span>
                            </button>
                        ` : `
                            <button type="button" onclick="openSubcontractorModal(${item.trip_id}, 'settle')" class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer" title="Đã quyết toán (bấm để xem lại)">
                                <i class="ph-bold ph-check text-xs text-emerald-600"></i><span>Đã Xong</span>
                            </button>
                        `}
                        <!-- 2. Xem -->
                        <button type="button" onclick="viewTripDetail('${item.trip_code}')" class="h-7 px-2.5 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 inline-flex items-center gap-1 cursor-pointer" title="Xem chi tiết chuyến xe">
                            <i class="ph-bold ph-eye text-xs"></i><span>Xem</span>
                        </button>
                        <!-- 3. In -->
                        <button type="button" onclick="printSubcontractorVoucher(${item.trip_id})" class="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer" title="In phiếu đối soát cước xe bạn A4">
                            <i class="ph-bold ph-printer text-xs text-slate-500"></i><span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Đồng bộ trạng thái master checkbox thead
    const activeCheckboxes = document.querySelectorAll('.subcon-row-checkbox:not(:disabled)');
    const checkedCheckboxes = document.querySelectorAll('.subcon-row-checkbox:not(:disabled):checked');
    const masterCb = document.getElementById('subcon-select-all');
    if (masterCb) {
        masterCb.checked = activeCheckboxes.length > 0 && activeCheckboxes.length === checkedCheckboxes.length;
        masterCb.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < activeCheckboxes.length;
    }

    if (window.BimTableFooter && Array.isArray(list)) {
        const totalCustRev = list.reduce((sum, i) => sum + (Number(i.cached_revenue) || 0), 0);
        const totalSubCost = list.reduce((sum, i) => sum + (Number(i.subcontractor_cost) || 0), 0);
        const totalMargin = list.reduce((sum, i) => sum + (Number(i.gross_company_margin) || 0), 0);
        const totalAdv = list.reduce((sum, i) => sum + (Number(i.subcontractor_advance) || 0), 0);
        const totalPayable = list.reduce((sum, i) => sum + (Number(i.remaining_payable) || 0), 0);
        window.BimTableFooter.render('accounting-subcon-table', {
            cells: [
                { html: '<span class="font-black text-slate-900 font-heading">TỔNG</span>', align: 'center', colspan: 2 },
                { html: `${list.length} chuyến xe bạn`, colspan: 4 },
                { html: `<span class="text-slate-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalCustRev)}</span>`, align: 'right' },
                { html: `<span class="text-rose-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalSubCost)}</span>`, align: 'right' },
                { html: `<span class="text-teal-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalMargin)}</span>`, align: 'right' },
                { html: `<span class="text-amber-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalAdv)}</span>`, align: 'right' },
                { html: `<span class="text-slate-900 font-black tabular-nums font-mono text-sm">${formatMoneyVND(totalPayable)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }
}

// -----------------------------------------------------------------------------
// CHỌN NHIỀU CHUYẾN & QUYẾT TOÁN HÀNG LOẠT (BATCH SETTLEMENT)
// -----------------------------------------------------------------------------
function toggleSelectAllSubconTrips(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    const visibleUnsettledTrips = (rawSubcontractorList || []).filter(t => t.subcontractor_settlement_status !== 'SETTLED');

    if (isChecked) {
        visibleUnsettledTrips.forEach(t => selectedSubconTripIds.add(t.trip_id));
    } else {
        visibleUnsettledTrips.forEach(t => selectedSubconTripIds.delete(t.trip_id));
    }

    document.querySelectorAll('.subcon-row-checkbox:not(:disabled)').forEach(cb => {
        cb.checked = isChecked;
    });

    updateBatchSettleButtonState();
}

function onSubconTripSelectionChange(tripId, isChecked) {
    if (typeof tripId !== 'undefined' && tripId !== null) {
        if (isChecked) {
            selectedSubconTripIds.add(tripId);
        } else {
            selectedSubconTripIds.delete(tripId);
        }
    } else {
        selectedSubconTripIds.clear();
        document.querySelectorAll('.subcon-row-checkbox:checked').forEach(cb => {
            const id = parseInt(cb.getAttribute('data-trip-id'), 10);
            if (id) selectedSubconTripIds.add(id);
        });
    }

    const activeCheckboxes = document.querySelectorAll('.subcon-row-checkbox:not(:disabled)');
    const checkedCheckboxes = document.querySelectorAll('.subcon-row-checkbox:not(:disabled):checked');
    const masterCb = document.getElementById('subcon-select-all');
    if (masterCb) {
        masterCb.checked = activeCheckboxes.length > 0 && activeCheckboxes.length === checkedCheckboxes.length;
        masterCb.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < activeCheckboxes.length;
    }

    updateBatchSettleButtonState();
}

function updateBatchSettleButtonState() {
    const btn = document.getElementById('btn-batch-settle-subcon');
    const label = document.getElementById('btn-batch-settle-subcon-label');
    if (!btn) return;

    const count = selectedSubconTripIds.size;
    // Yêu cầu: Khi chọn nhiều chuyến (>= 2) thì nút hiển thị bên cạnh "Xuất Bảng Kê Xe Bạn".
    // Trường hợp chỉ chọn 1 chuyến thì nút này ẩn hoặc không hiệu lực, mà chỉ có nút trong từng dòng hiệu lực.
    if (count >= 2) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
        if (label) label.innerText = `Quyết Toán Nhiều Chuyến (${count})`;
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
        if (label) label.innerText = 'Quyết Toán Nhiều Chuyến (0)';
    }
}

function openBatchSettleSubcontractorModal() {
    // Lập Phiếu quyết toán đối tác 3PL (bảng kê chỉ gồm cước thuê & chi phí hoàn trả, không có giá cước khách hàng)
    openSettlementStatement('PARTNER', Array.from(selectedSubconTripIds), {
        payment_method: document.getElementById('subcon-batch-payment-method')?.value || 'BANK'
    });
}

function closeBatchSettleSubcontractorModal() {
    const modal = document.getElementById('modal-subcontractor-batch-settle');
    if (modal) modal.classList.add('hidden');
}

async function handleSaveSubcontractorBatch(e) {
    if (e && e.preventDefault) e.preventDefault();

    const tripIds = Array.from(selectedSubconTripIds);
    if (tripIds.length < 2) {
        showToast('warning', 'Vui lòng chọn từ 2 chuyến xe bạn trở lên để quyết toán gom!');
        return;
    }

    const paymentMethod = document.getElementById('subcon-batch-payment-method')?.value || 'BANK';
    const bankInfo = document.getElementById('subcon-batch-bank-info')?.value || '';
    const notes = document.getElementById('subcon-batch-notes')?.value || '';

    const btn = document.getElementById('btn-submit-batch-subcon');
    if (btn) btn.disabled = true;

    try {
        const res = await fetchWithAuth('/api/accounting/subcontractor-settlements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'batch_settle',
                trip_ids: tripIds,
                payment_method: paymentMethod,
                bank_name: bankInfo,
                notes: notes
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || `Đã quyết toán gom thành công ${tripIds.length} chuyến xe bạn!`, 'Quyết Toán Thành Công');
            closeBatchSettleSubcontractorModal();
            selectedSubconTripIds.clear();
            await loadSubcontractorData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra khi quyết toán gom chuyến xe bạn!');
        }
    } catch (err) {
        console.error('Lỗi khi quyết toán gom:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi quyết toán gom!');
    } finally {
        if (btn) btn.disabled = false;
    }
}

let activeSubcontractorTrip = null;

function openSubcontractorModal(tripId, mode = 'update_cost') {
    const trip = rawSubcontractorList.find(t => t.trip_id === tripId);
    if (!trip) return;
    activeSubcontractorTrip = trip;

    const modal = document.getElementById('modal-subcontractor-settle');
    if (!modal) return;

    document.getElementById('subcon-trip-id').value = trip.trip_id;
    document.getElementById('subcon-action-type').value = mode;

    document.getElementById('subcon-trip-code').innerText = trip.trip_code;
    document.getElementById('subcon-vehicle-driver').innerText = `${trip.vehicle_plate} • ${trip.driver_name}`;
    document.getElementById('subcon-route').innerText = `${trip.customer_name} (${trip.route_name})`;
    document.getElementById('subcon-revenue').innerText = formatMoneyVND(trip.cached_revenue);

    document.getElementById('subcon-cost').value = trip.subcontractor_cost || '';
    document.getElementById('subcon-advance').value = trip.subcontractor_advance || '';
    document.getElementById('subcon-notes').value = trip.subcontractor_notes || '';

    const settleSection = document.getElementById('subcon-settle-section');
    const titleEl = document.getElementById('subcon-modal-title');
    const labelEl = document.getElementById('btn-save-subcon-label');

    if (mode === 'settle') {
        settleSection.classList.remove('hidden');
        titleEl.innerText = 'Quyết Toán Cước Xe Bạn & Xuất Phiếu Chi';
        labelEl.innerText = 'Xác Nhận Quyết Toán & Ghi Sổ Quỹ';
    } else {
        settleSection.classList.add('hidden');
        titleEl.innerText = 'Thỏa Thuận Cước & Tạm Ứng Xe Bạn';
        labelEl.innerText = 'Lưu';
    }

    // Chuyến đã quyết toán: khóa các ô nhập, chỉ cho In / Hủy quyết toán / Mở lại để sửa (không cho Lưu đè)
    const isSettled = trip.subcontractor_settlement_status === 'SETTLED';
    ['subcon-cost', 'subcon-advance', 'subcon-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = isSettled;
    });
    const unsettleBtn = document.getElementById('btn-subcon-unsettle');
    if (unsettleBtn) {
        unsettleBtn.classList.toggle('hidden', !isSettled);
        unsettleBtn.classList.toggle('flex', isSettled);
    }
    document.getElementById('btn-save-subcon')?.classList.toggle('hidden', isSettled);
    const editLabel = document.querySelector('#btn-subcon-edit span');
    if (editLabel) editLabel.innerText = isSettled ? 'Mở lại để sửa' : 'Sửa';
    const settleNote = document.getElementById('subcon-settle-section');
    if (isSettled && settleNote) settleNote.classList.add('hidden');
    if (isSettled) titleEl.innerText = 'Chuyến Xe Bạn Đã Quyết Toán';

    calculateSubcontractorMargin();
    modal.classList.remove('hidden');
}

function closeSubcontractorModal() {
    const modal = document.getElementById('modal-subcontractor-settle');
    if (modal) modal.classList.add('hidden');
}

function calculateSubcontractorMargin() {
    if (!activeSubcontractorTrip) return;
    const cost = parseInt(document.getElementById('subcon-cost')?.value || '0', 10) || 0;
    const adv = parseInt(document.getElementById('subcon-advance')?.value || '0', 10) || 0;
    const rev = activeSubcontractorTrip.cached_revenue || 0;
    const reimburse = activeSubcontractorTrip.sub_reimbursable_expenses || 0;

    const margin = rev - cost;
    const rem = Math.max(0, cost + reimburse - adv);

    const reimbEl = document.getElementById('subcon-calc-reimburse');
    if (reimbEl) {
        reimbEl.innerText = formatMoneyVND(reimburse);
    }

    const marginEl = document.getElementById('subcon-calc-margin');
    if (marginEl) {
        marginEl.innerText = formatMoneyVND(margin);
        marginEl.className = `font-black text-sm ${margin >= 0 ? 'text-teal-800' : 'text-rose-700'}`;
    }

    const remEl = document.getElementById('subcon-calc-remaining');
    if (remEl) {
        remEl.innerText = formatMoneyVND(rem);
    }
}

async function handleSaveSubcontractor(e) {
    e.preventDefault();
    if (!activeSubcontractorTrip) return;

    const action = document.getElementById('subcon-action-type').value;
    const tripId = document.getElementById('subcon-trip-id').value;
    const cost = document.getElementById('subcon-cost').value;
    const advance = document.getElementById('subcon-advance').value;
    const notes = document.getElementById('subcon-notes').value;
    const paymentMethod = document.getElementById('subcon-payment-method')?.value || 'BANK';
    const bankInfo = document.getElementById('subcon-bank-info')?.value || '';

    try {
        let payload = { action: action, trip_id: tripId, notes: notes };
        if (action === 'update_cost') {
            payload.subcontractor_cost = cost;
            payload.subcontractor_advance = advance;
        } else if (action === 'settle') {
            payload.payment_method = paymentMethod;
            payload.bank_name = bankInfo;
        }

        const res = await fetchWithAuth('/api/accounting/subcontractor-settlements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Thành Công');
            closeSubcontractorModal();
            loadSubcontractorData();
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function exportSubcontractorToExcel() {
    exportAccountingToExcel();
}

// -----------------------------------------------------------------------------
// SUBCONTRACTOR 3PL & SETTLEMENT ADVANCE PRINTING
// -----------------------------------------------------------------------------
function enableSubcontractorEdit() {
    // Chuyến đã quyết toán: phải hủy quyết toán (gỡ luôn phiếu chi) rồi mới sửa được
    if (activeSubcontractorTrip && activeSubcontractorTrip.subcontractor_settlement_status === 'SETTLED') {
        handleUnsettleSubcontractor(null, true);
        return;
    }
    ['subcon-cost', 'subcon-advance', 'subcon-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
    showToast('info', 'Đã mở khóa các trường cước thỏa thuận & tạm ứng');
}

async function handleUnsettleSubcontractor(tripId = null, reopenForEdit = false) {
    const targetId = tripId || (activeSubcontractorTrip ? activeSubcontractorTrip.trip_id : null);
    if (!targetId) return;

    const confirmed = await showConfirmModal({
        title: reopenForEdit ? 'Mở Lại Để Sửa' : 'Hủy Quyết Toán Xe Bạn',
        message: `Bạn có chắc chắn muốn HỦY QUYẾT TOÁN chuyến xe bạn này?

Chuyến sẽ quay về Chờ Quyết Toán và phiếu chi Sổ Quỹ đã tự động lập cho chuyến này (nếu có) sẽ bị xóa.`,
        confirmText: 'Hủy Quyết Toán',
        cancelText: 'Đóng',
        type: 'warning',
        icon: 'ph-bold ph-arrow-counter-clockwise text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth('/api/accounting/subcontractor-settlements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'unsettle',
                trip_id: targetId
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Đã hủy quyết toán thành công', 'Hoàn Tác Thành Công');
            closeSubcontractorModal();
            await loadSubcontractorData();
            if (typeof loadCashBookData === 'function') loadCashBookData();
            if (reopenForEdit) openSubcontractorModal(targetId, 'update_cost');
        } else {
            showToast('danger', data.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function printSubcontractorVoucher(tripId = null) {
    const targetId = tripId || (activeSubcontractorTrip ? activeSubcontractorTrip.trip_id : null);
    if (!targetId) return;

    const trip = (typeof rawSubcontractorList !== 'undefined' && rawSubcontractorList) 
        ? rawSubcontractorList.find(t => t.trip_id === targetId) 
        : activeSubcontractorTrip;
    if (!trip) return;

    const company = window.SYSTEM_COMPANY || {};
    const compName = company.name || 'CÔNG TY TNHH VẬN TẢI & GIAO NHẬN TRIỀN VÕ';
    const compAddress = company.address || 'Hồ Chí Minh, Việt Nam';

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
        alert('Trình duyệt đã chặn cửa sổ in (Pop-up). Vui lòng cho phép mở pop-up.');
        return;
    }

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Bảng Kê Quyết Toán Cước Xe Bạn - ${escapeHtml(trip.trip_code)}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 18mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; color: #111; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
        .company-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; color: #0f172a; }
        .title-box { text-align: center; margin: 15px 0 20px 0; }
        .title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .content-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .content-table td { padding: 6px 4px; vertical-align: top; }
        .label { font-weight: bold; width: 240px; }
        .money-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .money-table th, .money-table td { border: 1px solid #333; padding: 8px; }
        .money-table th { background: #f8fafc; font-weight: bold; }
        .signatures { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; }
        .signatures td { vertical-align: top; width: 33%; padding: 4px; font-size: 11pt; }
        @media print { .no-print { display: none !important; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 18px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">In Bảng Kê (A4)</button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #64748b; color: white; border: none; border-radius: 6px; margin-left: 8px; cursor: pointer;">Đóng</button>
    </div>

    <div class="header">
        <div>
            <div class="company-name">${escapeHtml(compName)}</div>
            <div style="font-size: 10pt;">${escapeHtml(compAddress)}</div>
        </div>
        <div style="text-align: right; font-size: 10pt;">
            <div>Mã chuyến: <strong>${escapeHtml(trip.trip_code)}</strong></div>
            <div>Ngày: ${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
    </div>

    <div class="title-box">
        <h1 class="title">BẢNG KÊ QUYẾT TOÁN CƯỚC XE BẠN / THẦU PHỤ</h1>
        <div style="font-style: italic; font-size: 11pt; margin-top: 4px;">Đối soát cước vận tải thuê ngoài & thanh toán</div>
    </div>

    <table class="content-table">
        <tr>
            <td class="label">Đơn vị thầu phụ / Nhà xe:</td>
            <td><strong>${escapeHtml(trip.subcontractor_name || trip.carrier_name || 'Nhà xe bạn')}</strong></td>
        </tr>
        <tr>
            <td class="label">Phương tiện & Tài xế:</td>
            <td>Biển số: <strong>${escapeHtml(trip.vehicle_plate)}</strong> • Tài xế: <strong>${escapeHtml(trip.driver_name)}</strong></td>
        </tr>
        <tr>
            <td class="label">Tuyến đường vận chuyển:</td>
            <td>${escapeHtml(trip.customer_name)} (${escapeHtml(trip.route_name)})</td>
        </tr>
    </table>

    <table class="money-table">
        <thead>
            <tr>
                <th>Khoản Mục Thanh Toán</th>
                <th style="width: 180px; text-align: right;">Số Tiền (VNĐ)</th>
                <th>Ghi Chú</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>1. Cước thỏa thuận trả xe bạn</strong></td>
                <td style="text-align: right; font-weight: bold;">${formatMoneyVND(trip.subcontractor_cost)}</td>
                <td>Cước phí trọn gói theo chuyến</td>
            </tr>
            <tr>
                <td><strong>2. Các khoản chi hộ hoàn lại 3PL</strong></td>
                <td style="text-align: right; font-weight: bold; color: #b45309;">+ ${formatMoneyVND(trip.sub_reimbursable_expenses || 0)}</td>
                <td>Vé cầu đường, nâng hạ cảng thầu phụ đã chi</td>
            </tr>
            <tr>
                <td><strong>3. Đã tạm ứng trước</strong></td>
                <td style="text-align: right; font-weight: bold; color: #dc2626;">- ${formatMoneyVND(trip.subcontractor_advance)}</td>
                <td>Tiền công ty đã chi tạm ứng</td>
            </tr>
            <tr style="background: #f0fdf4;">
                <td style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">Còn phải thanh toán (1 + 2 - 3):</td>
                <td style="text-align: right; font-size: 14pt; font-weight: bold; color: #047857;">${formatMoneyVND(trip.remaining_payable)}</td>
                <td>${trip.subcontractor_settlement_status === 'SETTLED' ? 'Đã quyết toán' : 'Chờ thanh toán'}</td>
            </tr>
        </tbody>
    </table>

    <div style="font-size: 11pt; margin-top: 15px;">
        Ghi chú đối soát: <em>${escapeHtml(trip.subcontractor_notes || 'Không có')}</em>
    </div>

    <table class="signatures">
        <tr>
            <td style="font-weight: bold;">Kế Toán Thanh Toán</td>
            <td style="font-weight: bold;">Điều Phối Đội Xe</td>
            <td style="font-weight: bold;">Đại Diện Nhà Xe Bạn</td>
        </tr>
        <tr>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
            <td style="font-style: italic; font-size: 9.5pt;">(Ký, họ tên)</td>
        </tr>
        <tr style="height: 75px;"><td></td><td></td><td></td></tr>
        <tr>
            <td></td><td></td><td style="font-weight: bold;">${escapeHtml(trip.driver_name)}</td>
        </tr>
    </table>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

// Global Window Exports
window.loadSubcontractorData = loadSubcontractorData;
window.renderSubcontractorTable = renderSubcontractorTable;
window.toggleSubconSort = toggleSubconSort;
window.toggleSelectAllSubconTrips = toggleSelectAllSubconTrips;
window.onSubconTripSelectionChange = onSubconTripSelectionChange;
window.openBatchSettleSubcontractorModal = openBatchSettleSubcontractorModal;
window.closeBatchSettleSubcontractorModal = closeBatchSettleSubcontractorModal;
window.handleSaveSubcontractorBatch = handleSaveSubcontractorBatch;
window.openSubcontractorModal = openSubcontractorModal;
window.closeSubcontractorModal = closeSubcontractorModal;
window.handleSaveSubcontractor = handleSaveSubcontractor;
window.exportSubcontractorToExcel = exportSubcontractorToExcel;
window.printSubcontractorVoucher = printSubcontractorVoucher;
window.handleUnsettleSubcontractor = handleUnsettleSubcontractor;
window.enableSubcontractorEdit = enableSubcontractorEdit;
