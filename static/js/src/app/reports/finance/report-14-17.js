// -------------------------------------------------------------
// RENDER BÁO CÁO 14: BÁO CÁO TUỔI ĐƠN TỒN ĐỌNG CHƯA QUYẾT TOÁN (UNSETTLED AGING)
// -------------------------------------------------------------
function renderReport14(data) {
    const r14 = data.report14_unsettled_aging || {};
    const elTotal = document.getElementById('rep14-stat-total-unsettled');
    if (elTotal) elTotal.innerText = `${r14.total_unsettled_count || 0} Chuyến`;

    const elRevStuck = document.getElementById('rep14-stat-rev-stuck');
    if (elRevStuck) elRevStuck.innerText = formatMoneyVND(r14.total_unsettled_revenue || 0);

    const elExpStuck = document.getElementById('rep14-stat-exp-stuck');
    if (elExpStuck) elExpStuck.innerText = `Chi phí đang ứng: ${formatMoneyVND(r14.total_unsettled_expense || 0)}`;

    const elOver30 = document.getElementById('rep14-stat-over-30');
    if (elOver30) elOver30.innerText = `${r14.over_30_days_count || 0} Chuyến`;

    const elMissingPod = document.getElementById('rep14-stat-missing-pod');
    if (elMissingPod) elMissingPod.innerText = `${r14.missing_pod_count || 0} Chuyến`;

    rep14DataCache = r14.records || [];
    applyReport14Filters();
}

function applyReport14Filters() {
    const searchVal = (document.getElementById('filter-rep14-search')?.value || '').toLowerCase().trim();
    const levelVal = document.getElementById('filter-rep14-level')?.value || 'ALL';

    let list = rep14DataCache.filter(item => {
        if (levelVal !== 'ALL' && item.aging_level !== levelVal) return false;

        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_plate || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.pending_reason || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep14SortCol];
        let valB = b[rep14SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep14SortAsc ? -1 : 1;
        if (valA > valB) return rep14SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep14-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không có chuyến xe nào bị tồn đọng chưa quyết toán</td></tr>`;
        const tfoot = document.getElementById('rep14-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalRev = list.reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.expense) || 0), 0);
    const avgDays = list.length > 0 ? Math.round(list.reduce((sum, item) => sum + (parseInt(item.days_unsettled) || 0), 0) / list.length) : 0;

    const tfoot = document.getElementById('rep14-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="3" class="text-right uppercase">TỔNG CỘNG: ${list.length} Đơn Tồn:</td>
                <td class="text-center font-bold text-rose-700 font-mono tabular-nums">TB ${avgDays} ngày</td>
                <td colspan="4"></td>
                <td class="text-right text-slate-900 font-mono font-bold tabular-nums">${formatMoneyVND(totalRev)}</td>
                <td class="text-right text-rose-700 font-mono font-bold tabular-nums">${formatMoneyVND(totalExp)}</td>
                <td colspan="3"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map((item, index) => {
        const revDisp = formatMoneyVND(item.revenue);
        const expDisp = formatMoneyVND(item.expense);

        let levelBadge = '';
        if (item.aging_level === 'CRITICAL') {
            levelBadge = '<span class="text-xs font-bold text-rose-700 uppercase tracking-wide">> 30 Ngày (Cực Gấp)</span>';
        } else if (item.aging_level === 'WARNING') {
            levelBadge = '<span class="text-xs font-bold text-amber-700 uppercase tracking-wide">16 - 30 Ngày (Cảnh Báo)</span>';
        } else if (item.aging_level === 'WATCH') {
            levelBadge = '<span class="text-xs font-bold text-sky-700 uppercase tracking-wide">8 - 15 Ngày (Đôn Thúc POD)</span>';
        } else {
            levelBadge = '<span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">0 - 7 Ngày (Bình Thường)</span>';
        }

        const podBadge = item.has_pod
            ? '<span class="text-xs font-bold text-emerald-700 uppercase">Đã Có POD</span>'
            : '<span class="text-xs font-bold text-rose-700 uppercase">Thiếu POD Gốc</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                </td>
                <td class="text-center text-xs font-mono text-slate-600 font-bold">${escapeHtml(item.loading_date)}</td>
                <td class="text-center text-xs font-black text-rose-700 tabular-nums">${item.days_unsettled} ngày</td>
                <td class="text-center text-xs">${levelBadge}</td>
                <td class="text-xs font-bold text-slate-800">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs">
                    <div class="font-mono font-bold text-slate-900">${escapeHtml(item.vehicle_plate)}</div>
                    <div class="text-[10px] text-slate-500">${escapeHtml(item.ownership_label)}</div>
                </td>
                <td class="text-xs font-bold text-slate-800">
                    <div>
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                </td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${revDisp}</td>
                <td class="text-right text-xs text-rose-700 tabular-nums">${expDisp}</td>
                <td class="text-xs text-slate-700 max-w-xs font-medium" title="${escapeHtml(item.pending_reason)}">
                    <div class="flex items-center gap-1 text-rose-800">
                        <i class="ph-bold ph-warning-circle shrink-0"></i>
                        <span>${escapeHtml(item.pending_reason)}</span>
                    </div>
                </td>
                <td class="text-center text-xs">${podBadge}</td>
                <td class="text-center text-xs">
                    <span class="text-xs font-semibold text-slate-700 uppercase">${escapeHtml(item.status_label)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport14Sort(col) {
    if (rep14SortCol === col) {
        rep14SortAsc = !rep14SortAsc;
    } else {
        rep14SortCol = col;
        rep14SortAsc = false;
    }
    applyReport14Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 15: PHỄU BÁO GIÁ CRM & TỶ LỆ CHỐT HỢP ĐỒNG
// -------------------------------------------------------------
function renderReport15(data) {
    const r15 = data.report15_crm_quotations || {};

    // Thẻ 1: Doanh Thu Kế Hoạch (Đã Ký Hợp Đồng)
    const elContracted = document.getElementById('rep15-stat-contracted-val');
    const contractedVal = r15.contracted_revenue !== undefined ? r15.contracted_revenue : (r15.approved_value || 0);
    if (elContracted) elContracted.innerText = formatMoneyVND(contractedVal);
    const elContractedNote = document.getElementById('rep15-note-contracted-val');
    if (elContractedNote) elContractedNote.innerText = `Đã ký: ${r15.approved_count || 0} hợp đồng`;

    // Thẻ 2: Doanh Thu Kỳ Vọng (Chờ Ký / Đang Đàm Phán)
    const elExpected = document.getElementById('rep15-stat-expected-val');
    const expectedVal = r15.expected_revenue !== undefined ? r15.expected_revenue : Math.max(0, (r15.pipeline_value || 0) - (r15.approved_value || 0));
    if (elExpected) elExpected.innerText = formatMoneyVND(expectedVal);
    const elExpectedNote = document.getElementById('rep15-note-expected-val');
    const pendingCount = (r15.negotiating_count || 0) + (r15.pending_approval_count || 0) + (r15.sent_count || 0);
    if (elExpectedNote) elExpectedNote.innerText = `Đang đàm phán & gửi: ${pendingCount} báo giá`;

    // Thẻ 3: Tổng Giá Trị Chào Giá Phễu
    const elPipe = document.getElementById('rep15-stat-pipeline-val');
    if (elPipe) elPipe.innerText = formatMoneyVND(r15.pipeline_value || 0);
    const elPipeNote = document.getElementById('rep15-note-pipeline-val');
    if (elPipeNote) elPipeNote.innerText = `Tổng ${r15.total_quotations || 0} cơ hội chào giá`;

    // Thẻ 4: Tỷ Lệ Chốt Thành Công (Win Rate %)
    const elWin = document.getElementById('rep15-stat-win-rate');
    if (elWin) elWin.innerText = `${r15.win_rate || 0}%`;
    const elWinNote = document.getElementById('rep15-note-win-rate');
    if (elWinNote) elWinNote.innerText = `Tỷ lệ ký HĐ thành công`;

    rep15DataCache = r15.quotations || [];
    applyReport15Filters();
}

function applyReport15Filters() {
    const searchVal = (document.getElementById('filter-rep15-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep15-status')?.value || '';

    let list = rep15DataCache.filter(item => {
        if (statusVal && item.status !== statusVal) return false;
        if (!searchVal) return true;
        return (item.quotation_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.customer_code || '').toLowerCase().includes(searchVal) ||
               (item.route_description || '').toLowerCase().includes(searchVal);
    });

    rep15DataFiltered = list;
    list.sort((a, b) => {
        let valA = a[rep15SortCol];
        let valB = b[rep15SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep15SortAsc ? -1 : 1;
        if (valA > valB) return rep15SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep15-tbody');
    const tfoot = document.getElementById('rep15-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy báo giá nào phù hợp với bộ lọc</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    let sumTrips = 0;
    let sumRev = 0;

    tbody.innerHTML = list.map((item, idx) => {
        sumTrips += (item.expected_trips_monthly || 0);
        sumRev += (item.monthly_revenue || 0);
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center text-xs font-bold text-slate-400 w-12">${idx + 1}</td>
                <td class="text-xs font-black text-indigo-700 font-mono">
                    <a href="/sales/quotations/${item.id}/" target="_blank" class="hover:underline flex items-center gap-1">
                        <span>${escapeHtml(item.quotation_code)}</span>
                        <i class="ph-bold ph-arrow-square-out text-[11px]"></i>
                    </a>
                </td>
                <td class="text-xs font-bold text-slate-900">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs text-slate-700 font-medium max-w-xs truncate" title="${escapeHtml(item.route_description)}">
                    ${escapeHtml(item.route_description)}
                </td>
                <td class="text-right text-xs font-mono font-bold text-slate-900 tabular-nums">${formatMoneyVND(item.unit_price)}</td>
                <td class="text-center text-xs font-mono font-bold text-slate-800">${item.expected_trips_monthly} chuyến/th</td>
                <td class="text-right text-xs font-mono font-black text-indigo-700 tabular-nums">${formatMoneyVND(item.monthly_revenue)}</td>
                <td class="text-center text-xs text-slate-600">${escapeHtml(item.pricing_method || 'Đa tuyến')}</td>
                <td class="text-center text-xs">
                    ${(() => {
                        if (item.status === 'APPROVED') return '<span class="font-bold text-emerald-700">Đã ký HĐ</span>';
                        if (item.status === 'NEGOTIATING') return '<span class="font-bold text-amber-600">Đang đàm phán</span>';
                        if (item.status === 'PENDING_APPROVAL') return '<span class="font-bold text-indigo-700">Chờ duyệt</span>';
                        if (item.status === 'SENT') return '<span class="font-bold text-blue-700">Đã gửi</span>';
                        if (item.status === 'REJECTED') return '<span class="font-bold text-rose-600">Từ chối</span>';
                        return `<span class="font-bold text-slate-600">${escapeHtml(item.status_label)}</span>`;
                    })()}
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.created_at)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black text-xs text-slate-900">
                <td class="text-center py-3">TỔNG</td>
                <td colspan="4" class="py-3 font-heading uppercase tracking-wider text-slate-700">TỔNG CỘNG (${list.length} BÁO GIÁ)</td>
                <td class="text-center font-mono py-3 font-black">${sumTrips} chuyến/th</td>
                <td class="text-right font-mono py-3 font-black text-indigo-700">${formatMoneyVND(sumRev)}</td>
                <td colspan="3" class="py-3"></td>
            </tr>
        `;
    }
}

function toggleReport15Sort(col) {
    if (rep15SortCol === col) rep15SortAsc = !rep15SortAsc;
    else { rep15SortCol = col; rep15SortAsc = false; }
    applyReport15Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 16: ĐƠN HÀNG BOOKING HÃNG TÀU & TIẾN ĐỘ ĐIỀU XE
// -------------------------------------------------------------
function renderReport16(data) {
    const r16 = data.report16_active_bookings || {};
    const elTotal = document.getElementById('rep16-stat-total-bookings');
    if (elTotal) elTotal.innerText = `${r16.total_bookings || 0} Đơn`;

    const elProg = document.getElementById('rep16-stat-dispatch-progress');
    if (elProg) elProg.innerText = `${r16.dispatch_rate || 0}%`;

    const elProgNote = document.getElementById('rep16-note-dispatch-progress');
    if (elProgNote) elProgNote.innerText = `Đã điều: ${r16.dispatched_containers || 0} / Tổng ${r16.total_containers || 0} Cont`;

    const elPending = document.getElementById('rep16-stat-pending-dispatch');
    if (elPending) elPending.innerText = `${r16.pending_dispatch_count || 0} Đơn`;

    const elComp = document.getElementById('rep16-stat-completed-dispatch');
    if (elComp) elComp.innerText = `${r16.completed_dispatch_count || 0} Đơn`;

    rep16DataCache = r16.bookings || [];
    applyReport16Filters();
}

function applyReport16Filters() {
    const searchVal = (document.getElementById('filter-rep16-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep16-status')?.value || '';

    let list = rep16DataCache.filter(item => {
        if (statusVal && item.status !== statusVal) return false;
        if (!searchVal) return true;
        return (item.booking_code || '').toLowerCase().includes(searchVal) ||
               (item.booking_number || '').toLowerCase().includes(searchVal) ||
               (item.shipping_line || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.route_full || '').toLowerCase().includes(searchVal);
    });

    rep16DataFiltered = list;
    list.sort((a, b) => {
        let valA = a[rep16SortCol];
        let valB = b[rep16SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep16SortAsc ? -1 : 1;
        if (valA > valB) return rep16SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep16-tbody');
    const tfoot = document.getElementById('rep16-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy đơn hàng booking nào phù hợp</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    let sumTotalConts = 0;
    let sumDispatchedConts = 0;

    tbody.innerHTML = list.map((item, idx) => {
        sumTotalConts += (item.total_containers || 0);
        sumDispatchedConts += (item.dispatched_containers || 0);
        const isFullyDispatched = item.dispatched_containers >= item.total_containers;
        const progressBadge = isFullyDispatched 
            ? `<span class="font-bold text-emerald-700 text-xs">Đã đủ (${item.dispatched_containers}/${item.total_containers})</span>`
            : `<span class="font-bold text-amber-600 text-xs">Còn thiếu ${item.remaining_containers} (${item.dispatched_containers}/${item.total_containers})</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center text-xs font-bold text-slate-400 w-12">${idx + 1}</td>
                <td class="text-xs font-black text-blue-700 font-mono">${escapeHtml(item.booking_code)}</td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">${escapeHtml(item.shipping_line)}</div>
                    <div class="text-[11px] font-mono text-slate-600">${escapeHtml(item.booking_number || '-')}</div>
                </td>
                <td class="text-xs font-bold text-slate-900">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-center text-xs font-mono font-bold text-slate-700">${escapeHtml(item.container_size)}</td>
                <td class="text-center text-xs font-mono font-black text-slate-900">${item.total_containers} Cont</td>
                <td class="text-center text-xs">${progressBadge}</td>
                <td class="text-xs text-slate-700 font-medium max-w-xs truncate" title="${escapeHtml(item.route_full)}">
                    ${escapeHtml(item.route_full)}
                </td>
                <td class="text-center text-xs font-mono text-rose-700 font-bold">${escapeHtml(item.closing_time)}</td>
                <td class="text-center text-xs">
                    ${(() => {
                        if (item.status === 'APPROVED') return '<span class="font-bold text-emerald-700">Đã ký HĐ</span>';
                        if (item.status === 'NEGOTIATING') return '<span class="font-bold text-amber-600">Đang đàm phán</span>';
                        if (item.status === 'PENDING_APPROVAL') return '<span class="font-bold text-indigo-700">Chờ duyệt</span>';
                        if (item.status === 'SENT') return '<span class="font-bold text-blue-700">Đã gửi</span>';
                        if (item.status === 'REJECTED') return '<span class="font-bold text-rose-600">Từ chối</span>';
                        return `<span class="font-bold text-slate-600">${escapeHtml(item.status_label)}</span>`;
                    })()}
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.created_at)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black text-xs text-slate-900">
                <td class="text-center py-3">TỔNG</td>
                <td colspan="4" class="py-3 font-heading uppercase tracking-wider text-slate-700">TỔNG CỘNG (${list.length} BOOKING)</td>
                <td class="text-center font-mono py-3 font-black">${sumTotalConts} Cont</td>
                <td class="text-center font-mono py-3 font-black text-teal-700">Đã điều: ${sumDispatchedConts} Cont</td>
                <td colspan="4" class="py-3"></td>
            </tr>
        `;
    }
}

function toggleReport16Sort(col) {
    if (rep16SortCol === col) rep16SortAsc = !rep16SortAsc;
    else { rep16SortCol = col; rep16SortAsc = false; }
    applyReport16Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 17: GIÁM SÁT ĐƠN HÀNG ĐANG CHẠY CHƯA HOÀN THÀNH
// -------------------------------------------------------------
function renderReport17(data) {
    const r17 = data.report17_wip_active_trips || {};
    const elTotal = document.getElementById('rep17-stat-total-wip');
    if (elTotal) elTotal.innerText = `${r17.total_wip_count || 0} Chuyến`;

    const elTransit = document.getElementById('rep17-stat-in-transit');
    if (elTransit) elTransit.innerText = `${r17.in_transit_count || 0} Xe`;

    const elWh = document.getElementById('rep17-stat-at-warehouse');
    if (elWh) elWh.innerText = `${r17.at_warehouse_count || 0} Xe`;

    const elDisp = document.getElementById('rep17-stat-dispatched');
    if (elDisp) elDisp.innerText = `${r17.dispatched_count || 0} Xe`;

    const badgeWip = document.getElementById('badge-report-wip-count');
    if (badgeWip) {
        const cnt = r17.total_wip_count || 0;
        badgeWip.innerText = cnt;
        badgeWip.className = cnt > 0
            ? 'px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800'
            : 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500';
    }

    rep17DataCache = r17.trips || [];
    applyReport17Filters();
}

function applyReport17Filters() {
    const searchVal = (document.getElementById('filter-rep17-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep17-status')?.value || '';

    let list = rep17DataCache.filter(item => {
        if (statusVal && item.status !== statusVal) return false;
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.license_plate || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.booking_number || '').toLowerCase().includes(searchVal) ||
               (item.route_display || '').toLowerCase().includes(searchVal);
    });

    rep17DataFiltered = list;
    list.sort((a, b) => {
        let valA = a[rep17SortCol];
        let valB = b[rep17SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep17SortAsc ? -1 : 1;
        if (valA > valB) return rep17SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep17-tbody');
    const tfoot = document.getElementById('rep17-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Hiện không có chuyến xe nào đang trong tình trạng dở dang (WIP)</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    tbody.innerHTML = list.map((item, idx) => {
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center text-xs font-bold text-slate-400 w-12">${idx + 1}</td>
                <td class="text-xs font-black text-amber-700 font-mono">
                    <span class="hover:underline cursor-pointer" onclick="openMasterTripFullview({trip_code: '${escapeHtml(item.trip_code)}'})">${escapeHtml(item.trip_code)}</span>
                </td>
                <td class="text-xs font-bold text-slate-900">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.license_plate)}</td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">${escapeHtml(item.driver_name)}</div>
                    <div class="text-[11px] font-mono text-slate-500">${escapeHtml(item.driver_phone || '-')}</div>
                </td>
                <td class="text-center text-xs font-mono font-semibold text-slate-700">${escapeHtml(item.container_display)}</td>
                <td class="text-xs text-slate-700 font-medium max-w-xs truncate" title="${escapeHtml(item.route_display)}">
                    ${escapeHtml(item.route_display)}
                </td>
                <td class="text-center text-xs">
                    ${(() => {
                        if (item.status === 'APPROVED') return '<span class="font-bold text-emerald-700">Đã ký HĐ</span>';
                        if (item.status === 'NEGOTIATING') return '<span class="font-bold text-amber-600">Đang đàm phán</span>';
                        if (item.status === 'PENDING_APPROVAL') return '<span class="font-bold text-indigo-700">Chờ duyệt</span>';
                        if (item.status === 'SENT') return '<span class="font-bold text-blue-700">Đã gửi</span>';
                        if (item.status === 'REJECTED') return '<span class="font-bold text-rose-600">Từ chối</span>';
                        return `<span class="font-bold text-slate-600">${escapeHtml(item.status_label)}</span>`;
                    })()}
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.booking_number)}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.cargo_notes)}">${escapeHtml(item.cargo_notes || '-')}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black text-xs text-slate-900">
                <td class="text-center py-3">TỔNG</td>
                <td colspan="8" class="py-3 font-heading uppercase tracking-wider text-slate-700">TỔNG CỘNG ${list.length} CHUYẾN XE ĐANG THỰC HIỆN DỞ DANG (WIP)</td>
                <td class="py-3"></td>
            </tr>
        `;
    }
}

function toggleReport17Sort(col) {
    if (rep17SortCol === col) rep17SortAsc = !rep17SortAsc;
    else { rep17SortCol = col; rep17SortAsc = false; }
    applyReport17Filters();
}
