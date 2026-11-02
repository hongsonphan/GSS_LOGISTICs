let customerSettlementsCache = [];
let customerSettlementsSummary = {};
let selectedCustTripIds = new Set();
let custSettleSortColumn = null;
let custSettleSortDirection = 'asc';

function toggleCustomerSettleSort(col) {
    if (custSettleSortColumn === col) {
        custSettleSortDirection = custSettleSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        custSettleSortColumn = col;
        custSettleSortDirection = 'asc';
    }
    applyCustSettleSortAndRender();
}

function filterCustomerSettlementsClientSide() {
    applyCustSettleSortAndRender();
}

function applyCustSettleSortAndRender() {
    if (!customerSettlementsCache || !Array.isArray(customerSettlementsCache)) return;
    let list = [...customerSettlementsCache];

    const searchInput = document.getElementById('cust-settle-search-input');
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (term) {
        list = list.filter(t => {
            const code = (t.trip_code || '').toLowerCase();
            const cust = (t.customer_name || '').toLowerCase();
            const cont = (t.container_number || '').toLowerCase();
            const route = (t.route || '').toLowerCase();
            return code.includes(term) || cust.includes(term) || cont.includes(term) || route.includes(term);
        });
    }

    if (custSettleSortColumn) {
        list.sort((a, b) => {
            let valA = a[custSettleSortColumn];
            let valB = b[custSettleSortColumn];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA == null) valA = '';
            if (valB == null) valB = '';

            if (valA < valB) return custSettleSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return custSettleSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Cập nhật icon thead
    const sortCols = ['trip_code', 'loading_date', 'customer_name', 'revenue', 'reimbursable', 'total_receivable'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-cust-${col}`);
        if (iconEl) {
            if (custSettleSortColumn === col) {
                iconEl.className = custSettleSortDirection === 'asc'
                    ? 'ph-bold ph-arrow-up text-emerald-600 text-xs'
                    : 'ph-bold ph-arrow-down text-emerald-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderCustomerSettlementsTable(list);
}

async function loadCustomerSettlementsData() {
    const custId = document.getElementById('cust-settle-filter-customer')?.value || '';
    const fromDate = document.getElementById('cust-settle-filter-from-date')?.value || '';
    const toDate = document.getElementById('cust-settle-filter-to-date')?.value || '';
    const statusVal = document.getElementById('cust-settle-filter-status')?.value || 'ALL';

    const tbody = document.getElementById('cust-settle-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 italic"><i class="ph-bold ph-spinner animate-spin text-lg block mb-1"></i> Đang tải dữ liệu quyết toán khách hàng...</td></tr>`;
    }

    try {
        const params = new URLSearchParams({
            customer_id: custId,
            from_date: fromDate,
            to_date: toDate,
            status: statusVal
        });
        const res = await fetchWithAuth(`/api/accounting/customer-reconciliation/?${params.toString()}`);
        if (!res.ok) throw new Error('Không thể tải dữ liệu quyết toán khách hàng');
        const data = await res.json();
        customerSettlementsCache = data.trips || [];
        customerSettlementsSummary = data.summary || {};

        const elFreight = document.getElementById('cust-settle-stat-freight');
        if (elFreight) elFreight.innerText = formatMoneyVND(data.summary?.total_revenue || 0);

        const elReimb = document.getElementById('cust-settle-stat-reimb');
        if (elReimb) elReimb.innerText = formatMoneyVND(data.summary?.total_reimbursable || 0);

        const elTotal = document.getElementById('cust-settle-stat-total');
        if (elTotal) elTotal.innerText = formatMoneyVND(data.summary?.total_receivable || 0);

        const elTrips = document.getElementById('cust-settle-stat-trips');
        if (elTrips) elTrips.innerText = `${data.summary?.pending_trips || 0} / ${data.summary?.total_trips || 0} Chuyến`;

        const elTripsSub = document.getElementById('cust-settle-stat-trips-sub');
        if (elTripsSub) elTripsSub.innerText = `Chờ quyết toán: ${data.summary?.pending_trips || 0} | Đã chốt: ${data.summary?.settled_trips || 0}`;

        const badgeTab = document.getElementById('badge-acct-customer-settlements');
        if (badgeTab) badgeTab.innerText = data.summary?.pending_trips || 0;

        const countEl = document.getElementById('cust-settle-count-badge');
        if (countEl) countEl.innerText = `${customerSettlementsCache.length} chuyến`;

        // Bỏ chọn các chuyến không còn tồn tại
        const availableIds = new Set(customerSettlementsCache.map(t => t.id));
        for (const id of selectedCustTripIds) {
            if (!availableIds.has(id)) selectedCustTripIds.delete(id);
        }

        populateCustomerSettleFilter();
        applyCustSettleSortAndRender();
        updateCustBatchSettleButtonState();
    } catch (err) {
        console.error('Error loading customer settlements:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning text-lg block mb-1"></i> Lỗi nạp dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
        }
    }
}

function populateCustomerSettleFilter() {
    const sel = document.getElementById('cust-settle-filter-customer');
    if (!sel || sel.children.length > 1) return;
    const custMap = new Map();
    customerSettlementsCache.forEach(t => {
        if (t.customer_id && t.customer_name) {
            custMap.set(String(t.customer_id), t.customer_name);
        }
    });
    custMap.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = name;
        sel.appendChild(opt);
    });
}

function renderCustomerSettlementsTable(list = null) {
    const displayList = list !== null ? list : customerSettlementsCache;
    const tbody = document.getElementById('cust-settle-tbody');
    if (!tbody) return;

    if (!displayList || displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 italic">Không có chuyến xe nào theo điều kiện lọc đã chọn</td></tr>`;
        return;
    }

    tbody.innerHTML = displayList.map((t, idx) => {
        const isSettled = !!t.is_customer_settled;
        const isChecked = selectedCustTripIds.has(t.id);
        const chkDisabled = isSettled ? 'disabled title="Chuyến này đã quyết toán xong"' : '';
        const chkClass = isSettled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer';

        const statusBadge = isSettled
            ? `<span class="text-emerald-700 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-check-circle text-xs"></i> Đã Quyết Toán</span>`
            : `<span class="text-amber-600 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-clock text-xs"></i> Chờ Quyết Toán</span>`;

        const podBadge = t.has_pod
            ? `<span class="text-emerald-700 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-check-circle text-xs"></i> Đầy đủ</span>`
            : `<span class="text-slate-400 font-medium flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-clock text-xs"></i> Chưa có</span>`;

        return `
            <tr class="hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-emerald-50/40' : ''}">
                <td class="w-10 text-center border-r border-slate-200">
                    <input type="checkbox"
                        class="cust-settle-row-checkbox rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 ${chkClass}"
                        data-trip-id="${t.id}"
                        ${isChecked ? 'checked' : ''}
                        ${chkDisabled}
                        onchange="onCustSettleTripSelectionChange(${t.id}, this.checked)">
                </td>
                <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">${idx + 1}</td>
                <td class="p-3 font-mono font-bold text-teal-900">${escapeHtml(t.trip_code)}</td>
                <td class="p-3 font-semibold text-slate-700 whitespace-nowrap text-center">${escapeHtml(t.loading_date)}</td>
                <td class="p-3 font-bold text-slate-900 max-w-[200px] truncate" title="${escapeHtml(t.customer_name)}">${escapeHtml(t.customer_name)}</td>
                <td class="p-3 font-mono text-slate-700">${escapeHtml(t.container_number || '-')}</td>
                <td class="p-3 text-slate-600 text-[11px] max-w-[220px] truncate" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</td>
                <td class="p-3 font-mono font-bold text-teal-800 text-right tabular-nums">${formatMoneyVND(t.revenue || 0)}</td>
                <td class="p-3 font-mono font-semibold text-amber-700 text-right tabular-nums">${formatMoneyVND(t.reimbursable || 0)}</td>
                <td class="p-3 font-mono font-black text-slate-900 text-right tabular-nums bg-slate-50/50">${formatMoneyVND(t.total_receivable || 0)}</td>
                <td class="p-3 text-center">${podBadge}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center cell-actions whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <!-- 1. Quyết toán -->
                        ${isSettled ? `
                            <button type="button" onclick="toggleCustomerSettleSingle(${t.id}, 'UNSETTLE')" title="Mở lại quyết toán doanh thu khách hàng" 
                                class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer">
                                <i class="ph-bold ph-arrow-counter-clockwise text-xs"></i><span>Mở Lại</span>
                            </button>
                        ` : `
                            <button type="button" onclick="openSettlementStatement('CUSTOMER', [${t.id}], { with_cash: false })" title="Lập bảng kê quyết toán khách hàng" 
                                class="h-7 px-2.5 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer">
                                <i class="ph-bold ph-check-circle text-xs"></i><span>Quyết Toán</span>
                            </button>
                        `}
                        <!-- 2. Xem -->
                        <button type="button" onclick="viewTripDetail('${escapeHtml(t.trip_code)}')" title="Xem chi tiết chuyến xe & chứng từ" 
                            class="h-7 px-2.5 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 inline-flex items-center gap-1 cursor-pointer">
                            <i class="ph-bold ph-eye text-xs"></i><span>Xem</span>
                        </button>
                        <!-- 3. In -->
                        <button type="button" onclick="printCustomerSettlementVoucher(${t.id}, ${t.customer_id || 'null'})" title="In bảng kê đối soát công nợ khách hàng (SOA)" 
                            class="h-7 px-2.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer">
                            <i class="ph-bold ph-printer text-xs text-slate-500"></i><span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Đồng bộ master checkbox thead
    const activeCheckboxes = document.querySelectorAll('.cust-settle-row-checkbox:not(:disabled)');
    const checkedCheckboxes = document.querySelectorAll('.cust-settle-row-checkbox:not(:disabled):checked');
    const masterCb = document.getElementById('cust-settle-select-all');
    if (masterCb) {
        masterCb.checked = activeCheckboxes.length > 0 && activeCheckboxes.length === checkedCheckboxes.length;
        masterCb.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < activeCheckboxes.length;
    }

    if (window.BimTableFooter && Array.isArray(displayList)) {
        const totalRev = displayList.reduce((sum, i) => sum + (Number(i.revenue) || 0), 0);
        const totalReimb = displayList.reduce((sum, i) => sum + (Number(i.reimbursable) || 0), 0);
        const totalRec = displayList.reduce((sum, i) => sum + (Number(i.total_receivable) || 0), 0);
        window.BimTableFooter.render('customer-settlements-table', {
            cells: [
                { html: '<span class="font-black text-slate-900 font-heading">TỔNG</span>', align: 'center', colspan: 2 },
                { html: `${displayList.length} chuyến`, colspan: 5 },
                { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalRev)}</span>`, align: 'right' },
                { html: `<span class="text-amber-700 font-bold tabular-nums font-mono">${formatMoneyVND(totalReimb)}</span>`, align: 'right' },
                { html: `<span class="text-slate-900 font-black tabular-nums font-mono">${formatMoneyVND(totalRec)}</span>`, align: 'right' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }

    if (window.BimTableColumnManager && typeof window.BimTableColumnManager.register === 'function') {
        window.BimTableColumnManager.register('customer-settlements-table');
    }
}

function toggleSelectAllCustTrips(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    const visibleUnsettledTrips = (customerSettlementsCache || []).filter(t => !t.is_customer_settled);

    if (isChecked) {
        visibleUnsettledTrips.forEach(t => selectedCustTripIds.add(t.id));
    } else {
        visibleUnsettledTrips.forEach(t => selectedCustTripIds.delete(t.id));
    }

    document.querySelectorAll('.cust-settle-row-checkbox:not(:disabled)').forEach(cb => {
        cb.checked = isChecked;
    });

    updateCustBatchSettleButtonState();
}

function onCustSettleTripSelectionChange(tripId, isChecked) {
    if (typeof tripId !== 'undefined' && tripId !== null) {
        if (isChecked) {
            selectedCustTripIds.add(tripId);
        } else {
            selectedCustTripIds.delete(tripId);
        }
    } else {
        selectedCustTripIds.clear();
        document.querySelectorAll('.cust-settle-row-checkbox:checked').forEach(cb => {
            const id = parseInt(cb.getAttribute('data-trip-id'), 10);
            if (id) selectedCustTripIds.add(id);
        });
    }

    const activeCheckboxes = document.querySelectorAll('.cust-settle-row-checkbox:not(:disabled)');
    const checkedCheckboxes = document.querySelectorAll('.cust-settle-row-checkbox:not(:disabled):checked');
    const masterCb = document.getElementById('cust-settle-select-all');
    if (masterCb) {
        masterCb.checked = activeCheckboxes.length > 0 && activeCheckboxes.length === checkedCheckboxes.length;
        masterCb.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < activeCheckboxes.length;
    }

    updateCustBatchSettleButtonState();
}

function updateCustBatchSettleButtonState() {
    const btn = document.getElementById('btn-batch-settle-customer');
    const label = document.getElementById('btn-batch-settle-customer-label');
    if (!btn) return;

    const count = selectedCustTripIds.size;
    // Yêu cầu: Khi chọn nhiều chuyến (>= 2) thì nút hiển thị bên cạnh "Xem Bảng Kê SOA".
    // Trường hợp chỉ chọn 1 chuyến thì nút này ẩn, chỉ có nút trong từng dòng hiệu lực.
    if (count >= 2) {
        btn.classList.remove('hidden');
        btn.classList.add('inline-flex');
        if (label) label.innerText = `Quyết Toán Nhiều Chuyến (${count})`;
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('inline-flex');
        if (label) label.innerText = 'Quyết Toán Nhiều Chuyến';
    }
}

function toggleAllCustomerSettleChecks(checked) {
    const masterCb = document.getElementById('cust-settle-select-all');
    if (masterCb) {
        masterCb.checked = checked;
        toggleSelectAllCustTrips(masterCb);
    }
}

async function toggleCustomerSettleSingle(tripId, action) {
    try {
        const res = await fetchWithAuth('/api/accounting/customer-reconciliation/', {
            method: 'POST',
            body: JSON.stringify({
                action: action,
                trip_ids: [tripId]
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi cập nhật quyết toán');
        showToast('success', data.message || 'Cập nhật quyết toán khách hàng thành công!', 'Thành Công');
        loadCustomerSettlementsData();
    } catch (err) {
        showToast('error', err.message || 'Lỗi thao tác quyết toán', 'Lỗi');
    }
}

function executeBatchCustomerSettlement() {
    // Lập Phiếu quyết toán khách hàng (bảng kê chỉ gồm cước & chi hộ, không có chi phí tài xế/đối tác)
    openSettlementStatement('CUSTOMER', Array.from(selectedCustTripIds), { with_cash: false });
}

function openSelectedCustomerSOAView() {
    const custId = document.getElementById('cust-settle-filter-customer')?.value;
    if (!custId) {
        const first = customerSettlementsCache[0];
        if (first && first.customer_id) {
            viewCustomerARStatement(first.customer_id);
            return;
        }
        showToast('warning', 'Vui lòng chọn một khách hàng để xem bảng kê đối soát SOA!', 'Chọn Khách Hàng');
        return;
    }
    viewCustomerARStatement(custId);
}

window.renderBookingOrderOptions = renderBookingOrderOptions;
window.filterBookingOrderOptions = filterBookingOrderOptions;
window.clearBookingOrderSearch = clearBookingOrderSearch;
window.lookupBookingPrice = lookupBookingPrice;
window.onBookingPriceManualInput = onBookingPriceManualInput;
window.loadCustomerSettlementsData = loadCustomerSettlementsData;
window.populateCustomerSettleFilter = populateCustomerSettleFilter;
window.renderCustomerSettlementsTable = renderCustomerSettlementsTable;
window.toggleAllCustomerSettleChecks = toggleAllCustomerSettleChecks;
window.toggleSelectAllCustTrips = toggleSelectAllCustTrips;
window.onCustSettleTripSelectionChange = onCustSettleTripSelectionChange;
window.updateCustBatchSettleButtonState = updateCustBatchSettleButtonState;
window.toggleCustomerSettleSort = toggleCustomerSettleSort;
window.filterCustomerSettlementsClientSide = filterCustomerSettlementsClientSide;
window.toggleCustomerSettleSingle = toggleCustomerSettleSingle;
window.executeBatchCustomerSettlement = executeBatchCustomerSettlement;
window.openSelectedCustomerSOAView = openSelectedCustomerSOAView;
