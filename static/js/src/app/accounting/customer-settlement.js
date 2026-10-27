let customerSettlementsCache = [];
let customerSettlementsSummary = {};

async function loadCustomerSettlementsData() {
    const custId = document.getElementById('cust-settle-filter-customer')?.value || '';
    const fromDate = document.getElementById('cust-settle-filter-from-date')?.value || '';
    const toDate = document.getElementById('cust-settle-filter-to-date')?.value || '';
    const statusVal = document.getElementById('cust-settle-filter-status')?.value || 'ALL';

    const tbody = document.getElementById('cust-settle-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 italic"><i class="ph-bold ph-spinner animate-spin text-lg block mb-1"></i> Đang tải dữ liệu quyết toán khách hàng...</td></tr>`;
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

        const countEl = document.getElementById('cust-settle-table-count');
        if (countEl) countEl.innerText = `${customerSettlementsCache.length} chuyến`;

        populateCustomerSettleFilter();
        renderCustomerSettlementsTable();
    } catch (err) {
        console.error('Error loading customer settlements:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-rose-500 font-bold"><i class="ph-bold ph-warning text-lg block mb-1"></i> Lỗi nạp dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
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

function renderCustomerSettlementsTable() {
    const tbody = document.getElementById('cust-settle-tbody');
    if (!tbody) return;

    if (!customerSettlementsCache || customerSettlementsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 italic">Không có chuyến xe nào theo điều kiện lọc đã chọn</td></tr>`;
        return;
    }

    tbody.innerHTML = customerSettlementsCache.map((t, idx) => {
        // Bỏ badge: hiển thị typography tinh gọn kèm icon trực quan
        const statusBadge = t.is_customer_settled
            ? `<span class="text-emerald-700 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-check-circle text-xs"></i> Đã Quyết Toán</span>`
            : `<span class="text-amber-600 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-clock text-xs"></i> Chờ Quyết Toán</span>`;

        const podBadge = t.has_pod
            ? `<span class="text-emerald-700 font-bold flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-check-circle text-xs"></i> Đầy đủ</span>`
            : `<span class="text-slate-400 font-medium flex items-center gap-1 justify-center text-xs"><i class="ph-bold ph-clock text-xs"></i> Chưa có</span>`;

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center">
                    <input type="checkbox" class="cust-settle-row-chk rounded border-slate-300 text-teal-600 focus:ring-teal-500" value="${t.id}" data-settled="${t.is_customer_settled}">
                </td>
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
                        ${t.is_customer_settled ? `
                            <button type="button" onclick="toggleCustomerSettleSingle(${t.id}, 'UNSETTLE')" title="Mở lại quyết toán doanh thu khách hàng" 
                                class="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 cursor-pointer">
                                <i class="ph-bold ph-arrow-counter-clockwise text-xs"></i><span>Mở Lại</span>
                            </button>
                        ` : `
                            <button type="button" onclick="toggleCustomerSettleSingle(${t.id}, 'SETTLE')" title="Chốt quyết toán doanh thu khách hàng" 
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

    if (window.BimTableFooter && Array.isArray(customerSettlementsCache)) {
        const totalRev = customerSettlementsCache.reduce((sum, i) => sum + (Number(i.revenue) || 0), 0);
        const totalReimb = customerSettlementsCache.reduce((sum, i) => sum + (Number(i.reimbursable) || 0), 0);
        const totalRec = customerSettlementsCache.reduce((sum, i) => sum + (Number(i.total_receivable) || 0), 0);
        window.BimTableFooter.render('customer-settlements-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `${customerSettlementsCache.length} chuyến`, colspan: 5 },
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

function toggleAllCustomerSettleChecks(checked) {
    document.querySelectorAll('.cust-settle-row-chk').forEach(chk => {
        chk.checked = checked;
    });
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

async function executeBatchCustomerSettlement() {
    const selectedIds = Array.from(document.querySelectorAll('.cust-settle-row-chk:checked')).map(el => parseInt(el.value));
    if (selectedIds.length === 0) {
        showToast('warning', 'Vui lòng chọn ít nhất một chuyến xe để chốt quyết toán với khách hàng!', 'Chưa Chọn Chuyến Xe');
        return;
    }

    if (!confirm(`Xác nhận chốt quyết toán đối soát (SOA) cho ${selectedIds.length} chuyến xe đã chọn?`)) {
        return;
    }

    try {
        const res = await fetchWithAuth('/api/accounting/customer-reconciliation/', {
            method: 'POST',
            body: JSON.stringify({
                action: 'SETTLE',
                trip_ids: selectedIds
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi chốt quyết toán');
        showToast('success', data.message || `Đã chốt quyết toán thành công ${selectedIds.length} chuyến xe!`, 'Thành Công');
        loadCustomerSettlementsData();
    } catch (err) {
        showToast('error', err.message || 'Lỗi chốt quyết toán', 'Lỗi');
    }
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
window.toggleCustomerSettleSingle = toggleCustomerSettleSingle;
window.executeBatchCustomerSettlement = executeBatchCustomerSettlement;
window.openSelectedCustomerSOAView = openSelectedCustomerSOAView;
