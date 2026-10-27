// -------------------------------------------------------------
// RENDER BÁO CÁO 13: BÁO CÁO THEO DÕI CÔNG NỢ PHẢI THU (AR AGING) & THU TIỀN
// -------------------------------------------------------------
let currentStatementCustomer = null;

function renderReport13(data) {
    const r13 = data.report13_ar_aging || {};

    const elTotalAr = document.getElementById('rep13-stat-total-ar');
    if (elTotalAr) elTotalAr.innerText = formatMoneyVND(r13.total_receivable || 0);

    const elRevReim = document.getElementById('rep13-stat-rev-reim');
    if (elRevReim) {
        const recTxt = formatMoneyVND(r13.total_reconciled || 0);
        const pendTxt = formatMoneyVND(r13.total_pending_reconcile || 0);
        elRevReim.innerHTML = `<span class="text-emerald-700 font-bold">Đã chốt SOA: ${recTxt}</span> · <span class="text-amber-700 font-bold">Chờ đối soát: ${pendTxt}</span>`;
    }

    const elCollected = document.getElementById('rep13-stat-collected');
    if (elCollected) elCollected.innerText = formatMoneyVND(r13.total_collected || 0);

    const elBalance = document.getElementById('rep13-stat-balance');
    if (elBalance) elBalance.innerText = formatMoneyVND(r13.total_remaining_balance || 0);

    const elOverdue = document.getElementById('rep13-stat-overdue');
    if (elOverdue) elOverdue.innerText = formatMoneyVND(r13.total_overdue || 0);

    rep13DataCache = r13.customers || [];
    applyReport13Filters();
}

function applyReport13Filters() {
    const searchVal = (document.getElementById('filter-rep13-search')?.value || '').toLowerCase().trim();

    let list = rep13DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.customer_code || '').toLowerCase().includes(searchVal) ||
               (item.tax_code || '').toLowerCase().includes(searchVal) ||
               (item.contact_phone || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep13SortCol];
        let valB = b[rep13SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep1SortAsc ? -1 : 1;
        if (valA > valB) return rep1SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep13-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy khách hàng nào có công nợ</td></tr>`;
        const tfoot = document.getElementById('rep13-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (parseInt(item.trips_count) || 0), 0);
    const totalReconciledTrips = list.reduce((sum, item) => sum + (parseInt(item.reconciled_trips_count) || 0), 0);
    const totalPendingTrips = list.reduce((sum, item) => sum + (parseInt(item.pending_reconcile_trips_count) || 0), 0);
    const totalFreight = list.reduce((sum, item) => sum + (parseFloat(item.freight_revenue) || 0), 0);
    const totalReim = list.reduce((sum, item) => sum + (parseFloat(item.reimbursable_amount) || 0), 0);
    const totalReceivable = list.reduce((sum, item) => sum + (parseFloat(item.total_receivable) || 0), 0);
    const totalCollected = list.reduce((sum, item) => sum + (parseFloat(item.collected_amount) || 0), 0);
    const totalBalance = list.reduce((sum, item) => sum + (parseFloat(item.remaining_balance) || 0), 0);
    const totalCurrent = list.reduce((sum, item) => sum + (parseFloat(item.aging_current) || 0), 0);
    const total31 = list.reduce((sum, item) => sum + (parseFloat(item.aging_31_60) || 0), 0);
    const total61 = list.reduce((sum, item) => sum + (parseFloat(item.aging_61_90) || 0), 0);
    const totalOver90 = list.reduce((sum, item) => sum + (parseFloat(item.aging_over_90) || 0), 0);

    const tfoot = document.getElementById('rep13-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="2" class="uppercase text-slate-900 font-heading font-black">TỔNG CỘNG: ${list.length} Khách Hàng</td>
                <td class="text-center font-bold font-mono text-slate-900 tabular-nums">${totalTrips}</td>
                <td class="text-center font-bold text-xs"><span class="text-emerald-700" title="Đã đối soát">${totalReconciledTrips} Chốt</span> / <span class="text-amber-700" title="Chờ đối soát">${totalPendingTrips} Chờ</span></td>
                <td class="text-right text-slate-900 font-mono font-bold tabular-nums">${formatMoneyVND(totalFreight)}</td>
                <td class="text-right text-slate-700 font-mono font-bold tabular-nums">${formatMoneyVND(totalReim)}</td>
                <td class="text-right text-slate-950 font-mono font-black tabular-nums">${formatMoneyVND(totalReceivable)}</td>
                <td class="text-right text-emerald-700 font-mono font-black tabular-nums">${formatMoneyVND(totalCollected)}</td>
                <td class="text-right text-indigo-700 font-mono font-black tabular-nums bg-indigo-50/50">${formatMoneyVND(totalBalance)}</td>
                <td class="text-right text-emerald-700 font-mono font-bold tabular-nums">${formatMoneyVND(totalCurrent)}</td>
                <td class="text-right text-amber-700 font-mono font-bold tabular-nums">${formatMoneyVND(total31)}</td>
                <td class="text-right text-orange-700 font-mono font-bold tabular-nums">${formatMoneyVND(total61)}</td>
                <td class="text-right text-rose-700 font-mono font-black tabular-nums">${formatMoneyVND(totalOver90)}</td>
                <td></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map((item, index) => {
        const freightDisp = formatMoneyVND(item.freight_revenue);
        const reimDisp = formatMoneyVND(item.reimbursable_amount);
        const totalDisp = formatMoneyVND(item.total_receivable);
        const collectedDisp = formatMoneyVND(item.collected_amount);
        const balanceDisp = formatMoneyVND(item.remaining_balance);
        const currentDisp = formatMoneyVND(item.aging_current);
        const aging31Disp = formatMoneyVND(item.aging_31_60);
        const aging61Disp = formatMoneyVND(item.aging_61_90);
        const agingOver90Disp = formatMoneyVND(item.aging_over_90);

        const custIdSafe = escapeHtml(String(item.customer_id || item.customer_code || ''));
        const recCount = item.reconciled_trips_count || 0;
        const pendCount = item.pending_reconcile_trips_count || 0;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-bold text-xs text-slate-900">
                    <div class="flex items-center gap-1.5 cursor-pointer text-teal-800 hover:text-teal-900" onclick="viewCustomerARStatement('${custIdSafe}')">
                        <i class="ph-bold ph-buildings text-teal-700"></i>
                        <span class="hover:underline">${escapeHtml(item.customer_name)}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono">Mã: ${escapeHtml(item.customer_code)} · MST: ${escapeHtml(item.tax_code)}</div>
                </td>
                <td class="text-center font-bold text-xs tabular-nums text-slate-800">${item.trips_count}</td>
                <td class="text-center text-xs tabular-nums">
                    <span class="font-bold text-xs ${recCount > 0 ? 'text-emerald-700' : 'text-slate-400'}" title="Đã chốt đối soát SOA">${recCount} Chốt</span>
                    <span class="text-slate-400"> / </span>
                    <span class="font-bold text-xs ${pendCount > 0 ? 'text-amber-700' : 'text-slate-400'}" title="Chờ đối soát">${pendCount} Chờ</span>
                </td>
                <td class="text-right text-xs text-slate-800 tabular-nums">${freightDisp}</td>
                <td class="text-right text-xs text-slate-600 tabular-nums">${reimDisp}</td>
                <td class="text-right text-xs font-black text-slate-900 tabular-nums">${totalDisp}</td>
                <td class="text-right text-xs font-bold text-emerald-700 tabular-nums">${collectedDisp}</td>
                <td class="text-right text-xs font-black text-indigo-700 tabular-nums bg-indigo-50/50">${balanceDisp}</td>
                <td class="text-right text-xs text-emerald-700 tabular-nums">${currentDisp}</td>
                <td class="text-right text-xs text-amber-700 tabular-nums">${aging31Disp}</td>
                <td class="text-right text-xs text-orange-700 tabular-nums">${aging61Disp}</td>
                <td class="text-right text-xs font-bold text-rose-700 tabular-nums">${agingOver90Disp}</td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button type="button" onclick="openCustomerFreightStatementModal('${custIdSafe}')" class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1" title="Lập Bảng Kê Vận Chuyển Tháng (Mẫu 26 cột đối soát cước & nâng hạ)">
                            <i class="ph-bold ph-file-spreadsheet text-xs"></i>
                            <span>Bảng Kê</span>
                        </button>
                        <button type="button" onclick="viewCustomerARStatement('${custIdSafe}')" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1" title="Xem bảng kê đối soát công nợ chi tiết (SOA)">
                            <i class="ph-bold ph-eye text-xs"></i>
                            <span>Đối Soát</span>
                        </button>
                        <button type="button" onclick="printCustomerARStatement('${custIdSafe}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1" title="In bảng kê đối soát công nợ A4 cho khách hàng">
                            <i class="ph-bold ph-printer text-xs"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewCustomerARStatement(customerId) {
    const cust = rep13DataCache.find(c => String(c.customer_id) === String(customerId) || String(c.customer_code) === String(customerId));
    if (!cust) {
        showToast('warning', 'Không tìm thấy dữ liệu đối soát của khách hàng', 'Thông Báo');
        return;
    }
    currentStatementCustomer = cust;

    // --- 1. ĐỔ DỮ LIỆU VÀO FULL-PAGE VIEW (view-customer-ar-statement) ---
    const soaView = document.getElementById('view-customer-ar-statement');
    if (soaView) {
        const elCustName = document.getElementById('soa-cust-name');
        if (elCustName) elCustName.innerText = cust.customer_name;

        const elCustCode = document.getElementById('soa-cust-badge-code');
        if (elCustCode) elCustCode.innerText = cust.customer_code || '-';

        const elCustTax = document.getElementById('soa-cust-tax');
        if (elCustTax) elCustTax.innerText = cust.tax_code || '-';

        const elCustPhone = document.getElementById('soa-cust-phone');
        if (elCustPhone) elCustPhone.innerText = cust.contact_phone || '-';

        const elFreight = document.getElementById('soa-stat-freight');
        if (elFreight) elFreight.innerText = formatMoneyVND(cust.freight_revenue || 0);

        const elReim = document.getElementById('soa-stat-reim');
        if (elReim) elReim.innerText = formatMoneyVND(cust.reimbursable_amount || 0);

        // Đã quyết toán với khách hàng -> Mới là Công nợ AR chính thức
        const elTotal = document.getElementById('soa-stat-total');
        if (elTotal) elTotal.innerText = formatMoneyVND(cust.reconciled_amount || cust.total_receivable || 0);

        // Chờ quyết toán với khách hàng -> Chưa tính công nợ
        const elPending = document.getElementById('soa-stat-pending');
        if (elPending) elPending.innerText = formatMoneyVND(cust.pending_settlement_amount || cust.pending_reconcile_amount || 0);

        const elCollected = document.getElementById('soa-stat-collected');
        if (elCollected) elCollected.innerText = formatMoneyVND(cust.collected_amount || 0);

        const elBalance = document.getElementById('soa-stat-balance');
        if (elBalance) elBalance.innerText = formatMoneyVND(cust.remaining_balance || 0);

        const elCount = document.getElementById('soa-trips-count-badge');
        if (elCount) elCount.innerText = `${cust.trips ? cust.trips.length : 0} Chuyến Vận Đơn`;

        // Render Bảng Chuyến trên Full-Page View
        renderSoaTripRows();

        // Cấu hình Topbar Fullpage Mode
        setTopbarFullpageMode({
            backFn: returnFromCustomerStatementView,
            prefix: 'Báo Cáo Công Nợ',
            title: `Bảng Kê Quyết Toán: ${cust.customer_name}`
        });

        // Ẩn tất cả view, mở fullpage view
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden-view'));
        soaView.classList.remove('hidden-view');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // Fallback nếu không có fullpage view: mở modal
    const modal = document.getElementById('modal-customer-ar-statement');
    if (modal) modal.classList.remove('hidden');
}

function renderSoaTripRows() {
    const cust = currentStatementCustomer;
    if (!cust) return;

    const fullTbody = document.getElementById('soa-fullpage-tbody');
    const fullTfoot = document.getElementById('soa-fullpage-tfoot');
    if (!fullTbody) return;

    const searchVal = (document.getElementById('soa-table-search')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('soa-status-filter')?.value || 'ALL';

    let trips = (cust.trips || []).filter(t => {
        const isCustSettled = !!(t.is_customer_settled || t.customer_reconciled);
        if (statusFilter === 'SETTLED' && !isCustSettled) return false;
        if (statusFilter === 'PENDING' && isCustSettled) return false;
        if (searchVal) {
            const rowText = `${t.trip_code} ${t.container_number} ${t.seal_number} ${t.route} ${t.driver_name} ${t.vehicle_plate} ${t.vat_invoice_number || ''} ${t.customer_soa_code || ''}`.toLowerCase();
            if (!rowText.includes(searchVal)) return false;
        }
        return true;
    });

    if (trips.length === 0) {
        fullTbody.innerHTML = `<tr><td colspan="15" class="text-center py-8 text-slate-400 font-medium"><i class="ph-bold ph-info text-2xl mb-1 block"></i> Không có chuyến xe nào phù hợp với bộ lọc</td></tr>`;
        if (fullTfoot) fullTfoot.innerHTML = '';
        return;
    }

    const sumRev = trips.reduce((sum, t) => sum + (parseFloat(t.revenue) || 0), 0);
    const sumReim = trips.reduce((sum, t) => sum + (parseFloat(t.reimbursable) || 0), 0);
    const sumTotal = trips.reduce((sum, t) => sum + (parseFloat(t.total_receivable) || 0), 0);

    fullTbody.innerHTML = trips.map((t, idx) => {
        const isCustSettled = !!(t.is_customer_settled || t.customer_reconciled);
        const isDrvSettled = !!t.is_driver_settled;
        const isSub = !!(t.is_subcontractor || t.vehicle_ownership === 'SUBCONTRACTOR' || t.vehicle_ownership === 'PARTNER');
        const isSubSettled = !!t.is_subcontractor_settled;

        return `
            <tr class="hover:bg-teal-50/40 transition-colors">
                <td class="text-center font-bold text-slate-500 py-3">${idx + 1}</td>
                <td class="font-bold text-teal-800 font-mono py-3">${escapeHtml(t.trip_code)}</td>
                <td class="text-center text-slate-700 py-3 font-mono">${escapeHtml(t.loading_date)}</td>
                <td class="text-slate-800 font-medium py-3">
                    <strong class="font-mono text-slate-900">${escapeHtml(t.vehicle_plate)}</strong> · <span class="text-slate-600">${escapeHtml(t.driver_name || '-')}</span>
                    <span class="block text-[10px] font-bold ${isSub ? 'text-amber-700' : 'text-teal-700'}">${isSub ? '🚛 Xe Thầu Phụ / 3PL' : '🚛 Xe Nhà'}</span>
                </td>
                <td class="font-mono text-slate-800 py-3">${escapeHtml(t.container_number || '-')}</td>
                <td class="text-slate-700 py-3 max-w-xs truncate" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</td>
                <td class="text-right text-slate-900 font-medium tabular-nums py-3">${formatMoneyVND(t.revenue || 0)}</td>
                <td class="text-right text-amber-700 font-medium tabular-nums py-3">${formatMoneyVND(t.reimbursable || 0)}</td>
                <td class="text-right font-black text-slate-950 tabular-nums bg-slate-100/70 py-3">${formatMoneyVND(t.total_receivable || 0)}</td>
                
                <!-- 1. Hoàn Thành Chuyến (Xong nội bộ) -->
                <td class="text-center py-3">
                    <span class="text-xs font-bold text-emerald-700 uppercase">
                        ✓ Xong Nội Bộ
                    </span>
                    <span class="block text-[10px] mt-0.5 font-bold ${t.has_pod ? 'text-emerald-700' : 'text-rose-600'}">
                        ${t.has_pod ? '(Đã nộp POD)' : '(Thiếu POD)'}
                    </span>
                </td>

                <!-- 2. Quyết Toán Tài Xế (Xe nhà) -->
                <td class="text-center py-3">
                    ${isSub ? '<span class="text-slate-400 italic text-[11px]">— Xe thầu phụ</span>' : `
                        <span class="text-xs font-bold uppercase ${isDrvSettled ? 'text-teal-700' : 'text-amber-700'}">
                            ${isDrvSettled ? '✓ Đã Quyết Toán' : '⏳ Chờ Quyết Toán'}
                        </span>
                    `}
                </td>

                <!-- 3. Quyết Toán Thầu Phụ (Xe bạn) -->
                <td class="text-center py-3">
                    ${!isSub ? '<span class="text-slate-400 italic text-[11px]">— Xe nhà</span>' : `
                        <span class="text-xs font-bold uppercase ${isSubSettled ? 'text-teal-700' : 'text-amber-700'}">
                            ${isSubSettled ? '✓ Đã Quyết Toán' : '⏳ Chờ Quyết Toán'}
                        </span>
                    `}
                </td>

                <!-- 4. Quyết Toán Với Khách Hàng (Mới tính nợ) -->
                <td class="text-center py-3">
                    <span class="text-xs font-bold uppercase ${isCustSettled ? 'text-emerald-700' : 'text-amber-700'}">
                        ${isCustSettled ? '✓ ĐÃ TÍNH NỢ (AR)' : '⏳ CHƯA TÍNH NỢ'}
                    </span>
                </td>

                <!-- Hóa Đơn VAT / SOA Code -->
                <td class="text-center py-3 font-mono text-xs">
                    ${t.vat_invoice_number ? `
                        <span class="text-indigo-800 font-bold block" title="HĐ VAT: ${escapeHtml(t.vat_invoice_number)}">HĐ: ${escapeHtml(t.vat_invoice_number)}</span>
                        <span class="text-[10px] text-slate-500 block">${escapeHtml(t.vat_invoice_date || '')}</span>
                    ` : (t.customer_soa_code && t.customer_soa_code !== '-' ? `
                        <span class="text-teal-700 font-semibold block">${escapeHtml(t.customer_soa_code)}</span>
                    ` : '<span class="text-slate-400">—</span>')}
                </td>

                <!-- Thao tác -->
                <td class="text-center py-3">
                    <div class="flex items-center justify-center">
                        <button type="button" onclick="promptSettleTrip(${t.trip_id}, ${isCustSettled})" 
                            class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 shadow-2xs ${isCustSettled ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'}" title="${isCustSettled ? 'Mở lại trạng thái quyết toán' : 'Chốt quyết toán công nợ chuyến này'}">
                            <i class="ph-bold ${isCustSettled ? 'ph-arrow-counter-clockwise' : 'ph-check-circle'} text-xs"></i>
                            <span>${isCustSettled ? 'Mở lại' : 'Chốt Quyết Toán'}</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (fullTfoot) {
        fullTfoot.innerHTML = `
            <tr class="bg-slate-100/95 font-bold border-t-2 border-slate-300">
                <td colspan="6" class="text-right uppercase p-3 text-slate-900 font-heading">TỔNG CỘNG: ${trips.length} Chuyến Vận Đơn:</td>
                <td class="text-right font-mono font-bold text-slate-900 p-3">${formatMoneyVND(sumRev)}</td>
                <td class="text-right font-mono font-bold text-amber-700 p-3">${formatMoneyVND(sumReim)}</td>
                <td class="text-right font-mono font-black text-slate-950 bg-slate-200/70 p-3 text-sm">${formatMoneyVND(sumTotal)}</td>
                <td colspan="6" class="p-3"></td>
            </tr>
        `;
    }
}

async function promptSettleTrip(tripId, currentSettled) {
    if (currentSettled) {
        if (!confirm('Xác nhận MỞ LẠI trạng thái chuyến xe? Chuyến này sẽ được rút khỏi Công nợ Khách Hàng (AR) cho đến khi được quyết toán lại.')) return;
        return executeCustomerSettlementApi('UNSETTLE', [tripId]);
    }

    const vatInv = prompt('Nhập số Hóa đơn GTGT / VAT xuất cho khách hàng (Nếu chưa có, để trống để chốt bảng kê SOA đối soát):', '');
    if (vatInv === null) return; // Người dùng bấm Hủy

    return executeCustomerSettlementApi('SETTLE', [tripId], vatInv ? vatInv.trim() : '');
}
window.promptSettleTrip = promptSettleTrip;

async function executeCustomerSettlementApi(action, tripIds, vatInvoiceNumber = '') {
    try {
        const payload = {
            action: action,
            trip_ids: tripIds
        };
        if (vatInvoiceNumber) payload.vat_invoice_number = vatInvoiceNumber;

        const res = await fetchWithAuth('/api/accounting/customer-reconciliation/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message || 'Cập nhật trạng thái quyết toán thành công', 'Thành Công');
            // Cập nhật local state
            if (currentStatementCustomer && currentStatementCustomer.trips) {
                const isSettle = (action === 'SETTLE');
                currentStatementCustomer.trips.forEach(t => {
                    if (tripIds.includes(t.trip_id)) {
                        t.is_customer_settled = isSettle;
                        t.customer_reconciled = isSettle;
                        t.customer_soa_code = isSettle ? (data.soa_code || t.customer_soa_code) : '';
                        t.vat_invoice_number = isSettle ? (data.vat_invoice_number || '') : '';
                    }
                });

                // Cập nhật lại các Card KPI trên đỉnh trang
                const settledAmount = currentStatementCustomer.trips
                    .filter(t => t.is_customer_settled || t.customer_reconciled)
                    .reduce((sum, t) => sum + (parseFloat(t.total_receivable) || 0), 0);
                const pendingAmount = currentStatementCustomer.trips
                    .filter(t => !t.is_customer_settled && !t.customer_reconciled)
                    .reduce((sum, t) => sum + (parseFloat(t.total_receivable) || 0), 0);
                const collected = parseFloat(currentStatementCustomer.collected_amount) || 0;
                const remBal = Math.max(0, settledAmount - collected);

                currentStatementCustomer.settled_amount = settledAmount;
                currentStatementCustomer.pending_settlement_amount = pendingAmount;
                currentStatementCustomer.remaining_balance = remBal;

                const statTotalEl = document.getElementById('soa-stat-total');
                if (statTotalEl) statTotalEl.textContent = formatMoneyVND(settledAmount);
                const statPendingEl = document.getElementById('soa-stat-pending');
                if (statPendingEl) statPendingEl.textContent = formatMoneyVND(pendingAmount);
                const statBalEl = document.getElementById('soa-stat-balance');
                if (statBalEl) statBalEl.textContent = formatMoneyVND(remBal);
            }
            renderSoaTripRows();
            if (typeof loadReportsData === 'function') loadReportsData(false);
        } else {
            showToast('error', data.error || 'Không thể thực hiện', 'Lỗi');
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Lỗi kết nối máy chủ', 'Lỗi');
    }
}
window.executeCustomerSettlementApi = executeCustomerSettlementApi;

async function batchReconcileCustomerAR(isSettle) {
    if (!currentStatementCustomer || !currentStatementCustomer.trips) return;
    const custName = currentStatementCustomer.customer_name;
    const allTripIds = currentStatementCustomer.trips.map(t => t.trip_id);
    if (!allTripIds.length) {
        showToast('warning', 'Không có chuyến xe nào để thực hiện', 'Thông báo');
        return;
    }

    if (!isSettle) {
        if (!confirm(`Xác nhận MỞ LẠI trạng thái cho toàn bộ ${allTripIds.length} chuyến xe của ${custName}?\nCác chuyến xe sẽ được rút khỏi Công nợ Phải Thu (AR) cho đến khi được quyết toán lại.`)) return;
        return executeCustomerSettlementApi('UNSETTLE', allTripIds);
    }

    const vatInv = prompt(`Xác nhận CHỐT QUYẾT TOÁN CÔNG NỢ (AR) cho ${allTripIds.length} chuyến xe của ${custName}?\nNhập số Hóa đơn GTGT / VAT xuất cho khách hàng (để trống nếu chỉ chốt bảng kê SOA đối soát):`, '');
    if (vatInv === null) return; // Bấm Hủy

    return executeCustomerSettlementApi('SETTLE', allTripIds, vatInv ? vatInv.trim() : '');
}
window.batchReconcileCustomerAR = batchReconcileCustomerAR;

function returnFromCustomerStatementView() {
    resetTopbarStandardMode('bao-cao');
    switchTab('bao-cao');
    if (typeof switchReportTab === 'function') {
        switchReportTab('report-13');
    }
}
window.returnFromCustomerStatementView = returnFromCustomerStatementView;

function filterSoaTable() {
    renderSoaTripRows();
}
window.filterSoaTable = filterSoaTable;

function exportCustomerStatementExcel() {
    if (!currentStatementCustomer || !currentStatementCustomer.trips) {
        showToast('warning', 'Không có dữ liệu đối soát để xuất file', 'Thông Báo');
        return;
    }
    const cust = currentStatementCustomer;
    const trips = cust.trips || [];
    
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `BẢNG KÊ ĐỐI SOÁT CÔNG NỢ KHÁCH HÀNG (STATEMENT OF ACCOUNT)\n`;
    csv += `Khách hàng:,"${cust.customer_name}",Mã KH:,"${cust.customer_code || '-'}",MST:,"${cust.tax_code || '-'}"\n`;
    csv += `Tổng cước vận tải:,"${cust.freight_revenue}",Tiền chi hộ:,"${cust.reimbursable_amount}",Tổng phải thu:,"${cust.total_receivable}"\n`;
    csv += `Đã thu hồi:,"${cust.collected_amount}",Còn phải thu:,"${cust.remaining_balance}"\n\n`;
    
    csv += `STT,Mã Chuyến,Ngày Chạy,Đầu Xe,Tài Xế,Số Container,Tuyến Đường,Cước Vận Tải,Tiền Chi Hộ,Tổng Phải Thu,POD,Quyết Toán\n`;
    trips.forEach((t, i) => {
        csv += `${i + 1},"${t.trip_code}","${t.loading_date}","${t.vehicle_plate}","${t.driver_name || ''}","${t.container_number || ''}","${t.route}",${t.revenue || 0},${t.reimbursable || 0},${t.total_receivable || 0},"${t.has_pod ? 'Đã Nộp' : 'Thiếu'}","${t.is_settled ? 'Đã Chốt' : 'Chưa Chốt'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bang_Ke_Doi_Soat_${cust.customer_code || 'KH'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('success', 'Đã xuất file bảng kê đối soát thành công!', 'Xuất Excel');
}
window.exportCustomerStatementExcel = exportCustomerStatementExcel;

function closeCustomerARStatementModal() {
    const modal = document.getElementById('modal-customer-ar-statement');
    if (modal) modal.classList.add('hidden');
}

function printCurrentCustomerStatement() {
    if (!currentStatementCustomer) return;
    printCustomerARStatement(currentStatementCustomer.customer_id);
}

function printCustomerARStatement(customerId) {
    const cust = rep13DataCache.find(c => String(c.customer_id) === String(customerId) || String(c.customer_code) === String(customerId));
    if (!cust) {
        showToast('Không tìm thấy thông tin khách hàng để in đối soát', 'error');
        return;
    }
    currentStatementCustomer = cust;

    // Thiết lập dữ liệu vào Modal In Báo Cáo chung với tiêu đề và định dạng Statement of Account
    const modal = document.getElementById('modal-report-print');
    if (!modal) {
        window.print();
        return;
    }

    // Đặt tiêu đề báo cáo in
    const titleEl = document.getElementById('print-rep-title');
    if (titleEl) titleEl.innerText = `BẢNG KÊ ĐỐI SOÁT CÔNG NỢ & CƯỚC VẬN CHUYỂN`;

    const subTitleEl = document.getElementById('print-rep-subtitle');
    if (subTitleEl) subTitleEl.innerText = `Khách hàng: ${cust.customer_name} (Mã: ${cust.customer_code || '-'} · MST: ${cust.tax_code || '-'})`;

    // Thiết lập KPIs tóm tắt
    const kpisContainer = document.getElementById('print-rep-kpis');
    if (kpisContainer) {
        kpisContainer.innerHTML = `
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Tổng Cước Vận Tải</span>
                <p class="text-base font-black text-slate-900 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.freight_revenue || 0)}</p>
                <p class="text-[9.5px] text-slate-500 truncate mt-0.5">Cước hợp đồng chuyến</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Tổng Khoản Chi Hộ</span>
                <p class="text-base font-black text-slate-900 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.reimbursable_amount || 0)}</p>
                <p class="text-[9.5px] text-slate-500 truncate mt-0.5">Nâng hạ cảng, lưu cont, phụ phí</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Đã Thanh Toán</span>
                <p class="text-base font-black text-emerald-700 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.collected_amount || 0)}</p>
                <p class="text-[9.5px] text-emerald-700 truncate mt-0.5">Đã thu hồi qua quỹ/ngân hàng</p>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-left border-l-4 border-l-indigo-600">
                <span class="text-[10.5px] font-bold text-slate-500 uppercase tracking-tight block truncate">Dư Nợ Còn Phải Trả</span>
                <p class="text-base font-black text-indigo-700 font-heading tabular-nums mt-0.5">${formatMoneyVND(cust.remaining_balance || 0)}</p>
                <p class="text-[9.5px] text-indigo-700 font-bold truncate mt-0.5">Số dư cần quyết toán đối soát</p>
            </div>
        `;
    }

    // Thiết lập Bảng In chi tiết từng chuyến
    const theadEl = document.getElementById('print-rep-table-thead');
    const tbodyEl = document.getElementById('print-rep-table-tbody');
    const tfootEl = document.getElementById('print-rep-table-tfoot');
    const wordsBox = document.getElementById('print-rep-words-box');
    const wordsText = document.getElementById('print-rep-amount-words');

    if (theadEl) {
        theadEl.innerHTML = `
            <tr>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">STT</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Mã Chuyến</th>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">Ngày Chạy</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Xe Kéo & Tài Xế</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Số Cont</th>
                <th class="border border-slate-400 p-2 text-slate-900 font-bold bg-slate-100">Tuyến Vận Chuyển</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100">Cước Vận Tải</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100">Chi Hộ</th>
                <th class="border border-slate-400 p-2 text-right text-slate-900 font-bold bg-slate-100 font-black">Tổng Phải Thu</th>
                <th class="border border-slate-400 p-2 text-center text-slate-900 font-bold bg-slate-100">Tình Trạng POD</th>
            </tr>
        `;
    }

    const trips = cust.trips || [];
    if (tbodyEl) {
        if (trips.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-400 italic">Không có chi tiết chuyến phát sinh trong kỳ</td></tr>`;
        } else {
            tbodyEl.innerHTML = trips.map((t, idx) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="border border-slate-300 p-1.5 text-center font-bold">${idx + 1}</td>
                    <td class="border border-slate-300 p-1.5 font-bold font-mono text-slate-900">${escapeHtml(t.trip_code)}</td>
                    <td class="border border-slate-300 p-1.5 text-center">${escapeHtml(t.loading_date)}</td>
                    <td class="border border-slate-300 p-1.5">${escapeHtml(t.vehicle_plate)} · ${escapeHtml(t.driver_name || '')}</td>
                    <td class="border border-slate-300 p-1.5 font-mono">${escapeHtml(t.container_number || '-')}</td>
                    <td class="border border-slate-300 p-1.5">${escapeHtml(t.route)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono">${formatMoneyVND(t.revenue || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono">${formatMoneyVND(t.reimbursable || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-right font-mono font-bold">${formatMoneyVND(t.total_receivable || 0)}</td>
                    <td class="border border-slate-300 p-1.5 text-center font-bold ${t.has_pod ? 'text-emerald-700' : 'text-rose-700'}">${t.has_pod ? 'Đã Nộp POD' : 'Thiếu POD'}</td>
                </tr>
            `).join('');
        }
    }

    if (tfootEl) {
        tfootEl.innerHTML = `
            <tr>
                <td colspan="6" class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right uppercase">TỔNG CỘNG ĐỐI SOÁT:</td>
                <td class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.freight_revenue || 0)}</td>
                <td class="border border-slate-400 p-2 font-bold text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.reimbursable_amount || 0)}</td>
                <td class="border border-slate-400 p-2 font-black text-slate-950 bg-slate-100 text-right font-mono">${formatMoneyVND(cust.total_receivable || 0)}</td>
                <td class="border border-slate-400 p-2 bg-slate-100"></td>
            </tr>
        `;
    }

    if (wordsBox && wordsText && typeof numberToWordsVN === 'function') {
        const bal = cust.remaining_balance || cust.total_receivable || 0;
        if (bal > 0) {
            wordsBox.classList.remove('hidden');
            wordsText.innerText = numberToWordsVN(bal);
        } else {
            wordsBox.classList.add('hidden');
        }
    }

    // Đảm bảo đồng bộ thông tin pháp lý công ty Triền Võ lên header bản in
    if (typeof syncCompanyProfileToPrintForms === 'function') {
        syncCompanyProfileToPrintForms();
    }

    modal.classList.remove('hidden');
}

window.viewCustomerARStatement = viewCustomerARStatement;
window.closeCustomerARStatementModal = closeCustomerARStatementModal;
window.printCurrentCustomerStatement = printCurrentCustomerStatement;
window.printCustomerARStatement = printCustomerARStatement;

// =========================================================================
// BẢNG KÊ VẬN CHUYỂN THÁNG ĐỐI SOÁT VỚI KHÁCH HÀNG (26 CỘT CHUẨN TRIỂN VÕ)
// =========================================================================
let currentFreightStatementCustomerId = null;
let currentFreightStatementData = null;

function openCustomerFreightStatementForCurrent() {
    if (!currentStatementCustomer) {
        showToast('warning', 'Chưa có thông tin khách hàng đang chọn', 'Thông Báo');
        return;
    }
    const custId = currentStatementCustomer.customer_id || currentStatementCustomer.customer_code;
    openCustomerFreightStatementModal(custId);
}
window.openCustomerFreightStatementForCurrent = openCustomerFreightStatementForCurrent;

function openCustomerFreightStatementModal(customerId, month = null, year = null, vatRate = 10) {
    if (!customerId) {
        showToast('warning', 'Vui lòng chọn khách hàng để lập bảng kê vận chuyển', 'Chưa Chọn Khách');
        return;
    }
    currentFreightStatementCustomerId = customerId;

    const modal = document.getElementById('modal-customer-freight-statement');
    if (!modal) return;

    const now = new Date();
    const selMonth = document.getElementById('cfs-filter-month');
    const selYear = document.getElementById('cfs-filter-year');
    const selVat = document.getElementById('cfs-filter-vat');

    let targetMonth = month || (now.getMonth() + 1);
    let targetYear = year || now.getFullYear();

    if (!month && currentStatementCustomer && currentStatementCustomer.trips && currentStatementCustomer.trips.length > 0) {
        const firstTrip = currentStatementCustomer.trips[0];
        if (firstTrip.loading_date) {
            const parts = firstTrip.loading_date.split('/');
            if (parts.length === 3) {
                targetMonth = parseInt(parts[1], 10);
                targetYear = parseInt(parts[2], 10);
            }
        }
    }

    if (selMonth) selMonth.value = String(targetMonth);
    if (selYear) selYear.value = String(targetYear);
    if (selVat) selVat.value = String(vatRate);

    modal.classList.remove('hidden');
    reloadCustomerFreightStatement();
}
window.openCustomerFreightStatementModal = openCustomerFreightStatementModal;

function closeCustomerFreightStatementModal() {
    const modal = document.getElementById('modal-customer-freight-statement');
    if (modal) modal.classList.add('hidden');
}
window.closeCustomerFreightStatementModal = closeCustomerFreightStatementModal;

async function reloadCustomerFreightStatement() {
    if (!currentFreightStatementCustomerId) return;

    const month = document.getElementById('cfs-filter-month')?.value || (new Date().getMonth() + 1);
    const year = document.getElementById('cfs-filter-year')?.value || new Date().getFullYear();
    const vatRate = document.getElementById('cfs-filter-vat')?.value || 10;

    const tbody = document.getElementById('cfs-table-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="26" class="text-center py-8 text-slate-500 font-medium"><i class="ph-bold ph-spinner-gap animate-spin text-xl inline-block mr-2 text-teal-600"></i> Đang trích xuất dữ liệu vận chuyển tháng ${month}/${year}...</td></tr>`;
    }

    try {
        const url = `/api/accounting/customer-statement/?customer_id=${encodeURIComponent(currentFreightStatementCustomerId)}&month=${month}&year=${year}&vat_rate=${vatRate}`;
        const res = await fetchWithAuth(url);
        const json = await res.json();

        if (res.ok && json.success) {
            currentFreightStatementData = json.data;
            renderCustomerFreightStatementUI(json.data);
        } else {
            showToast('error', json.error || 'Không thể tải bảng kê vận chuyển', 'Lỗi');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="26" class="text-center py-6 text-rose-600 font-medium"><i class="ph-bold ph-warning text-lg inline-block mr-1"></i> ${escapeHtml(json.error || 'Lỗi tải dữ liệu')}</td></tr>`;
            }
        }
    } catch (err) {
        console.error('Lỗi tải bảng kê vận chuyển:', err);
        showToast('error', 'Lỗi kết nối máy chủ', 'Lỗi Mạng');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="26" class="text-center py-6 text-rose-600 font-medium">Lỗi kết nối máy chủ khi trích xuất bảng kê</td></tr>`;
        }
    }
}
window.reloadCustomerFreightStatement = reloadCustomerFreightStatement;

function renderCustomerFreightStatementUI(data) {
    if (!data) return;

    const comp = data.company || {};
    const cust = data.customer || {};
    const totals = data.totals || {};
    const rows = data.rows || [];
    const period = data.period || {};

    const elCompName = document.getElementById('cfs-view-comp-name');
    if (elCompName) elCompName.innerText = comp.company_name || 'CÔNG TY TNHH DỊCH VỤ GIAO NHẬN VẬN TẢI TRIỂN VÕ';

    const elCompAddress = document.getElementById('cfs-view-comp-address');
    if (elCompAddress) elCompAddress.innerText = `ĐỊA CHỈ: ${comp.address || ''}`;

    const elCompTax = document.getElementById('cfs-view-comp-tax');
    if (elCompTax) elCompTax.innerText = `MST: ${comp.tax_code || '0315001374'}`;

    const elPeriodCode = document.getElementById('cfs-view-period-code');
    if (elPeriodCode) elPeriodCode.innerText = `THÁNG ${period.month || ''}/${period.year || ''}`;

    const elTitle = document.getElementById('cfs-view-title');
    if (elTitle) elTitle.innerText = data.statement_title ? data.statement_title.toUpperCase() : `BẢNG KÊ VẬN CHUYỂN THÁNG ${period.month}/${period.year}`;

    const elCustName = document.getElementById('cfs-view-customer-name');
    if (elCustName) elCustName.innerText = `KHÁCH HÀNG: ${(cust.name || cust.short_name || '').toUpperCase()}`;

    const elSignCust = document.getElementById('cfs-sign-customer-title');
    if (elSignCust) elSignCust.innerText = `ĐẠI DIỆN ${(cust.name || cust.short_name || 'KHÁCH HÀNG').toUpperCase()}`;

    const elSignComp = document.getElementById('cfs-sign-company-title');
    if (elSignComp) elSignComp.innerText = comp.company_name || 'CÔNG TY TNHH DỊCH VỤ GIAO NHẬN VẬN TẢI TRIỂN VÕ';

    const elRepName = document.getElementById('cfs-sign-representative-name');
    if (elRepName) elRepName.innerText = comp.representative_name || 'Võ Văn Triền';

    const elThVat = document.getElementById('cfs-th-vat-rate');
    if (elThVat) elThVat.innerText = period.vat_rate > 0 ? `VAT ${period.vat_rate}%` : 'VAT 0%';

    const tbody = document.getElementById('cfs-table-tbody');
    if (tbody) {
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="26" class="text-center py-8 text-slate-400 font-medium italic"><i class="ph-bold ph-info text-xl block mb-1"></i> Không có chuyến xe nào phát sinh trong tháng ${period.month}/${period.year} của khách hàng này</td></tr>`;
        } else {
            tbody.innerHTML = rows.map(r => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="border border-slate-900 p-1 text-center font-bold">${r.stt}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono">${escapeHtml(r.ngay)}</td>
                    <td class="border border-slate-900 p-1 max-w-[120px] truncate" title="${escapeHtml(r.ten_khach_hang)}">${escapeHtml(r.ten_khach_hang)}</td>
                    <td class="border border-slate-900 p-1 max-w-[100px] truncate" title="${escapeHtml(r.kho)}">${escapeHtml(r.kho)}</td>
                    <td class="border border-slate-900 p-1 max-w-[110px] truncate" title="${escapeHtml(r.noi_lay)}">${escapeHtml(r.noi_lay)}</td>
                    <td class="border border-slate-900 p-1 max-w-[110px] truncate" title="${escapeHtml(r.noi_ha)}">${escapeHtml(r.noi_ha)}</td>
                    <td class="border border-slate-900 p-1 text-center font-bold ${r.nx_code === 'X' ? 'text-blue-800' : (r.nx_code === 'N' ? 'text-emerald-800' : 'text-slate-800')}">${r.nx_code}</td>
                    <td class="border border-slate-900 p-1 text-center font-bold">${r.cont_20 > 0 ? r.cont_20 : ''}</td>
                    <td class="border border-slate-900 p-1 text-center font-bold">${r.cont_40 > 0 ? r.cont_40 : ''}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono font-bold">${escapeHtml(r.so_cont)}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono">${escapeHtml(r.booking_or_bill)}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.don_gia > 0 ? formatMoneyVND(r.don_gia) : ''}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.ha_xa > 0 ? formatMoneyVND(r.ha_xa) : ''}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.neo > 0 ? formatMoneyVND(r.neo) : ''}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.phu_thu > 0 ? formatMoneyVND(r.phu_thu) : ''}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono font-bold bg-amber-50/50">${formatMoneyVND(r.cong_cuoc)}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.vat_tien > 0 ? formatMoneyVND(r.vat_tien) : ''}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono font-black bg-amber-100/60">${formatMoneyVND(r.thanh_tien_cuoc)}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono text-[9px]">${escapeHtml(r.hd_nang || '')}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.tien_nang > 0 ? formatMoneyVND(r.tien_nang) : '0'}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono text-[9px]">${escapeHtml(r.hd_ha || '')}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.tien_ha > 0 ? formatMoneyVND(r.tien_ha) : '0'}</td>
                    <td class="border border-slate-900 p-1 text-right font-mono">${r.tien_cuoc > 0 ? formatMoneyVND(r.tien_cuoc) : '0'}</td>
                    <td class="border border-slate-900 p-1 max-w-[120px] truncate" title="${escapeHtml(r.ghi_chu)}">${escapeHtml(r.ghi_chu)}</td>
                    <td class="border border-slate-900 p-1 text-center font-mono">${escapeHtml(r.so_xe)}</td>
                    <td class="border border-slate-900 p-1 text-center font-medium ${r.is_settled ? 'text-emerald-700 font-bold' : 'text-slate-400'}">${escapeHtml(r.da_tra)}</td>
                </tr>
            `).join('');
        }
    }

    const tfoot = document.getElementById('cfs-table-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-amber-100/80 font-bold border-t-2 border-slate-900">
                <td colspan="7" class="border border-slate-900 p-1.5 text-right font-heading uppercase">CỘNG :</td>
                <td class="border border-slate-900 p-1 text-center font-bold">${totals.total_cont_20 || 0}</td>
                <td class="border border-slate-900 p-1 text-center font-bold">${totals.total_cont_40 || 0}</td>
                <td colspan="2" class="border border-slate-900 p-1"></td>
                <td class="border border-slate-900 p-1 text-right font-mono">${formatMoneyVND(totals.don_gia || 0)}</td>
                <td class="border border-slate-900 p-1 text-right font-mono">${totals.ha_xa > 0 ? formatMoneyVND(totals.ha_xa) : '0'}</td>
                <td class="border border-slate-900 p-1 text-right font-mono">${totals.neo > 0 ? formatMoneyVND(totals.neo) : '0'}</td>
                <td class="border border-slate-900 p-1 text-right font-mono">${totals.phu_thu > 0 ? formatMoneyVND(totals.phu_thu) : '0'}</td>
                <td class="border border-slate-900 p-1 text-right font-mono font-bold">${formatMoneyVND(totals.cong_cuoc || 0)}</td>
                <td class="border border-slate-900 p-1 text-right font-mono">${totals.vat_tien > 0 ? formatMoneyVND(totals.vat_tien) : '0'}</td>
                <td class="border border-slate-900 p-1 text-right font-mono font-black">${formatMoneyVND(totals.thanh_tien_cuoc || 0)}</td>
                <td class="border border-slate-900 p-1"></td>
                <td class="border border-slate-900 p-1 text-right font-mono">${formatMoneyVND(totals.tien_nang || 0)}</td>
                <td class="border border-slate-900 p-1"></td>
                <td class="border border-slate-900 p-1 text-right font-mono">${formatMoneyVND(totals.tien_ha || 0)}</td>
                <td class="border border-slate-900 p-1 text-right font-mono">${formatMoneyVND(totals.tien_cuoc || 0)}</td>
                <td colspan="3" class="border border-slate-900 p-1"></td>
            </tr>
            <tr class="bg-amber-200/90 font-black border-t border-slate-900 text-[11px]">
                <td colspan="7" class="border border-slate-900 p-1.5 text-right font-heading uppercase text-slate-950">THÀNH TIỀN :</td>
                <td colspan="4" class="border border-slate-900 p-1"></td>
                <td colspan="7" class="border border-slate-900 p-1 text-right font-mono font-black text-slate-950 text-xs bg-amber-300/60">${formatMoneyVND(totals.grand_total || 0)}</td>
                <td colspan="8" class="border border-slate-900 p-1 text-left italic text-[10px] text-slate-700 font-normal pl-2">(Đã bao gồm cước + nâng + hạ + cược cont)</td>
            </tr>
        `;
    }

    const elWords = document.getElementById('cfs-view-words');
    if (elWords) elWords.innerText = totals.grand_total_words || 'Không đồng.';
}
window.renderCustomerFreightStatementUI = renderCustomerFreightStatementUI;

function exportCustomerFreightStatementExcel() {
    if (!currentFreightStatementCustomerId) {
        showToast('warning', 'Chưa có thông tin khách hàng để xuất file', 'Thông Báo');
        return;
    }
    const month = document.getElementById('cfs-filter-month')?.value || (new Date().getMonth() + 1);
    const year = document.getElementById('cfs-filter-year')?.value || new Date().getFullYear();
    const vatRate = document.getElementById('cfs-filter-vat')?.value || 10;

    const url = `/api/accounting/customer-statement/export-excel/?customer_id=${encodeURIComponent(currentFreightStatementCustomerId)}&month=${month}&year=${year}&vat_rate=${vatRate}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Ke_Van_Chuyen_Thang_${month}_${year}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Đang tải Bảng Kê Vận Chuyển Tháng ${month}/${year}...`, 'Xuất Excel');
}
window.exportCustomerFreightStatementExcel = exportCustomerFreightStatementExcel;

function printCustomerFreightStatement() {
    window.print();
}
window.printCustomerFreightStatement = printCustomerFreightStatement;

function printCustomerSettlementVoucher(tripId, customerId) {
    if (customerId) {
        openCustomerFreightStatementModal(customerId);
    } else {
        openCustomerFreightStatementForCurrent();
    }
}
window.printCustomerSettlementVoucher = printCustomerSettlementVoucher;
