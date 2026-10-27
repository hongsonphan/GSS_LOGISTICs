// -------------------------------------------------------------
// RENDER BÁO CÁO 8: QUYẾT TOÁN & CÔNG NỢ NHÀ XE THẦU PHỤ 3PL
// -------------------------------------------------------------
function renderReport8(data) {
    const r8 = data.report8_subcontractor_settlements || {};

    const elTrips = document.getElementById('rep8-stat-trips');
    if (elTrips) elTrips.innerText = `${r8.total_subcontractor_trips || 0} Chuyến`;

    const elGross = document.getElementById('rep8-stat-gross');
    if (elGross) elGross.innerText = formatMoneyVND(r8.total_gross_payable || 0);

    const elSettled = document.getElementById('rep8-stat-settled');
    if (elSettled) elSettled.innerText = formatMoneyVND(r8.total_subcontractor_settled || 0);

    const elBalance = document.getElementById('rep8-stat-balance');
    if (elBalance) elBalance.innerText = formatMoneyVND(r8.total_balance_due || 0);

    rep8SubcontractorsCache = r8.subcontractors || [];
    rep8TripsCache = r8.trips || [];

    applyReport8Filters();
}

function toggleReport8SubSort(col) {
    if (rep8SubSortCol === col) {
        rep8SubSortAsc = !rep8SubSortAsc;
    } else {
        rep8SubSortCol = col;
        rep8SubSortAsc = false;
    }
    applyReport8Filters();
}

function toggleReport8TripSort(col) {
    if (rep8TripSortCol === col) {
        rep8TripSortAsc = !rep8TripSortAsc;
    } else {
        rep8TripSortCol = col;
        rep8TripSortAsc = false;
    }
    applyReport8Filters();
}

function applyReport8Filters() {
    const searchVal = (document.getElementById('filter-rep8-search')?.value || '').toLowerCase().trim();

    // 1. Render Bảng Nhà xe thầu phụ
    let subList = rep8SubcontractorsCache.filter(item => {
        if (!searchVal) return true;
        return (item.subcontractor_name || '').toLowerCase().includes(searchVal) ||
               (item.contact_info || '').toLowerCase().includes(searchVal) ||
               (item.bank_info || '').toLowerCase().includes(searchVal);
    });

    subList.sort((a, b) => {
        let valA = a[rep8SubSortCol];
        let valB = b[rep8SubSortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep8SubSortAsc ? -1 : 1;
        if (valA > valB) return rep8SubSortAsc ? 1 : -1;
        return 0;
    });

    const subTbody = document.getElementById('rep8-subcontractors-tbody');
    const subTfoot = document.getElementById('rep8-subcontractors-tfoot');
    if (subTbody) {
        if (subList.length === 0) {
            subTbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy nhà xe thầu phụ nào trong kỳ</td></tr>`;
            if (subTfoot) subTfoot.innerHTML = '';
        } else {
            const sumTrips = subList.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
            const sumGross = subList.reduce((sum, item) => sum + (Number(item.gross_payable) || 0), 0);
            const sumAdv = subList.reduce((sum, item) => sum + (Number(item.advance_amount) || 0), 0);
            const sumSettled = subList.reduce((sum, item) => sum + (Number(item.settled_amount) || 0), 0);
            const sumBal = subList.reduce((sum, item) => sum + (Number(item.balance_due) || 0), 0);

            subTbody.innerHTML = subList.map((s, index) => {
                const grossDisp = formatMoneyVND(s.gross_payable);
                const advDisp = formatMoneyVND(s.advance_amount);
                const settledDisp = formatMoneyVND(s.settled_amount);
                const balDisp = formatMoneyVND(s.balance_due);

                let statusBadge = s.balance_due <= 0
                    ? `<span class="text-xs font-bold text-emerald-700 uppercase">Đã quyết toán</span>`
                    : `<span class="text-xs font-bold text-amber-700 uppercase">${escapeHtml(s.settlement_status)}</span>`;

                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                        <td class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <i class="ph-bold ph-handshake text-indigo-600"></i>
                            <span>${escapeHtml(s.subcontractor_name)}</span>
                        </td>
                        <td class="text-xs text-slate-600">${escapeHtml(s.contact_info || '-')}</td>
                        <td class="text-xs font-mono text-slate-700 max-w-xs truncate" title="${escapeHtml(s.bank_info)}">${escapeHtml(s.bank_info || '-')}</td>
                        <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${s.trips_count}</td>
                        <td class="text-right font-black text-slate-800 text-xs tabular-nums">${grossDisp}</td>
                        <td class="text-right text-xs text-slate-600 tabular-nums">${advDisp}</td>
                        <td class="text-right text-xs font-bold text-emerald-700 tabular-nums">${settledDisp}</td>
                        <td class="text-right font-black text-rose-700 text-xs tabular-nums bg-rose-50/40">${balDisp}</td>
                        <td class="text-center">${statusBadge}</td>
                    </tr>
                `;
            }).join('');

            if (subTfoot) {
                subTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colspan="4" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${subList.length} Nhà Xe Thầu Phụ</td>
                        <td class="text-center font-mono font-black tabular-nums">${sumTrips}</td>
                        <td class="text-right font-mono font-black tabular-nums text-slate-900">${formatMoneyVND(sumGross)}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-slate-600">${formatMoneyVND(sumAdv)}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-emerald-700">${formatMoneyVND(sumSettled)}</td>
                        <td class="text-right font-mono font-black tabular-nums text-rose-700 bg-rose-50/80">${formatMoneyVND(sumBal)}</td>
                        <td></td>
                    </tr>
                `;
            }
        }
    }

    // 2. Render Bảng chi tiết chuyến xe ngoài
    const tripsTbody = document.getElementById('rep8-trips-tbody');
    const tripsTfoot = document.getElementById('rep8-trips-tfoot');
    if (tripsTbody) {
        let tripList = rep8TripsCache.filter(item => {
            if (!searchVal) return true;
            return (item.trip_code || '').toLowerCase().includes(searchVal) ||
                   (item.subcontractor_name || '').toLowerCase().includes(searchVal) ||
                   (item.vehicle || '').toLowerCase().includes(searchVal) ||
                   (item.driver || '').toLowerCase().includes(searchVal) ||
                   (item.route || '').toLowerCase().includes(searchVal) ||
                   (item.container_number || '').toLowerCase().includes(searchVal);
        });

        tripList.sort((a, b) => {
            let valA = a[rep8TripSortCol];
            let valB = b[rep8TripSortCol];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return rep8TripSortAsc ? -1 : 1;
            if (valA > valB) return rep8TripSortAsc ? 1 : -1;
            return 0;
        });

        if (tripList.length === 0) {
            tripsTbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không có chuyến xe ngoài nào được tìm thấy</td></tr>`;
            if (tripsTfoot) tripsTfoot.innerHTML = '';
        } else {
            const sumGross = tripList.reduce((sum, item) => sum + (Number(item.gross_cost) || 0), 0);
            const sumAdv = tripList.reduce((sum, item) => sum + (Number(item.advance) || 0), 0);
            const sumBal = tripList.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);

            tripsTbody.innerHTML = tripList.map((t, index) => {
                const costDisp = formatMoneyVND(t.gross_cost);
                const advDisp = formatMoneyVND(t.advance);
                const balDisp = formatMoneyVND(t.balance);

                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                        <td><a href="javascript:void(0)" onclick="viewTripDetail('${t.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(t.trip_code)}</a></td>
                        <td class="text-xs text-slate-600 tabular-nums">${escapeHtml(t.date)}</td>
                        <td class="text-xs font-semibold text-slate-800">${escapeHtml(t.subcontractor_name)}</td>
                        <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(t.vehicle)}</td>
                        <td class="text-xs text-slate-700">${escapeHtml(t.driver)}</td>
                        <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</td>
                        <td class="text-xs font-mono text-slate-700">${escapeHtml(t.container_number)}</td>
                        <td class="text-right font-black text-slate-800 text-xs tabular-nums">${costDisp}</td>
                        <td class="text-right text-xs text-slate-600 tabular-nums">${advDisp}</td>
                        <td class="text-right font-black text-rose-700 text-xs tabular-nums">${balDisp}</td>
                        <td class="text-center text-xs font-medium text-slate-700">${escapeHtml(t.status)}</td>
                    </tr>
                `;
            }).join('');

            if (tripsTfoot) {
                tripsTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colspan="8" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${tripList.length} Chuyến Xe Ngoài</td>
                        <td class="text-right font-mono font-black tabular-nums text-slate-900">${formatMoneyVND(sumGross)}</td>
                        <td class="text-right font-mono font-bold tabular-nums text-slate-600">${formatMoneyVND(sumAdv)}</td>
                        <td class="text-right font-mono font-black tabular-nums text-rose-700">${formatMoneyVND(sumBal)}</td>
                        <td></td>
                    </tr>
                `;
            }
        }
    }
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 9: BẢNG LƯƠNG CHUYẾN & NĂNG SUẤT TÀI XẾ
// -------------------------------------------------------------
function renderReport9(data) {
    const r9 = data.report9_driver_payroll_performance || {};

    const elFund = document.getElementById('rep9-stat-fund');
    if (elFund) elFund.innerText = formatMoneyVND(r9.total_payroll_fund || 0);

    const elDrivers = document.getElementById('rep9-stat-drivers');
    if (elDrivers) elDrivers.innerText = `${r9.active_drivers_count || 0} Tài xế`;

    const elAvg = document.getElementById('rep9-stat-avg');
    if (elAvg) elAvg.innerText = `${formatMoneyVND(r9.avg_salary_per_driver || 0)}/TX`;

    const elTop = document.getElementById('rep9-stat-top');
    if (elTop) elTop.innerText = r9.top_driver_name || '-';

    rep9DataCache = r9.drivers || [];

    applyReport9Filters();
}

function applyReport9Filters() {
    const searchVal = (document.getElementById('filter-rep9-search')?.value || '').toLowerCase().trim();

    let list = rep9DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.driver_code || '').toLowerCase().includes(searchVal) ||
               (item.phone || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep9SortCol];
        let valB = b[rep9SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep9SortAsc ? -1 : 1;
        if (valA > valB) return rep9SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep9-tbody');
    const tfoot = document.getElementById('rep9-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy tài xế nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalSplit = list.reduce((sum, item) => sum + (Number(item.split_trips_count) || 0), 0);
    const totalBase = list.reduce((sum, item) => sum + (Number(item.base_trip_salary) || 0), 0);
    const totalLayover = list.reduce((sum, item) => sum + (Number(item.layover_allowance) || 0), 0);
    const totalSpecial = list.reduce((sum, item) => sum + (Number(item.special_allowances) || 0), 0);
    const totalAdv = list.reduce((sum, item) => sum + (Number(item.total_advances) || 0), 0);
    const totalNet = list.reduce((sum, item) => sum + (Number(item.net_salary) || 0), 0);
    const avgOtp = list.length > 0 ? (list.reduce((sum, item) => sum + (Number(item.otp_rate) || 0), 0) / list.length).toFixed(1) : '0.0';
    const totalIncidents = list.reduce((sum, item) => sum + (Number(item.incident_count) || 0), 0);

    tbody.innerHTML = list.map((item, index) => {
        const baseDisp = formatMoneyVND(item.base_trip_salary);
        const layoverDisp = formatMoneyVND(item.layover_allowance);
        const specialDisp = formatMoneyVND(item.special_allowances);
        const advDisp = formatMoneyVND(item.total_advances);
        const netDisp = formatMoneyVND(item.net_salary);

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-identification-badge text-teal-700"></i>
                    <span>${escapeHtml(item.driver_name)}</span>
                </td>
                <td class="font-mono text-slate-500 text-xs">${escapeHtml(item.driver_code)}</td>
                <td class="text-xs font-mono text-slate-600">${escapeHtml(item.phone)}</td>
                <td class="text-center font-bold text-slate-800 text-xs tabular-nums">${item.trips_count}</td>
                <td class="text-center text-slate-600 text-xs tabular-nums">${item.split_trips_count > 0 ? `<span class="font-bold text-teal-700">${item.split_trips_count}</span>` : '0'}</td>
                <td class="text-right text-xs font-bold text-slate-800 tabular-nums">${baseDisp}</td>
                <td class="text-right text-xs text-amber-700 tabular-nums">${layoverDisp}</td>
                <td class="text-right text-xs text-slate-600 tabular-nums">${specialDisp}</td>
                <td class="text-right text-xs text-rose-600 tabular-nums">${advDisp}</td>
                <td class="text-right font-black text-emerald-700 text-xs tabular-nums bg-emerald-50/50">${netDisp}</td>
                <td class="text-center font-bold text-xs tabular-nums ${item.otp_rate >= 90 ? 'text-emerald-700' : 'text-amber-700'}">${item.otp_rate}%</td>
                <td class="text-center text-xs tabular-nums ${item.incident_count > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}">${item.incident_count}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="4" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Tài Xế</td>
                <td class="text-center font-mono font-black tabular-nums">${totalTrips}</td>
                <td class="text-center font-mono font-black text-teal-800 tabular-nums">${totalSplit}</td>
                <td class="text-right font-mono font-bold tabular-nums text-slate-800">${formatMoneyVND(totalBase)}</td>
                <td class="text-right font-mono font-bold tabular-nums text-amber-700">${formatMoneyVND(totalLayover)}</td>
                <td class="text-right font-mono font-medium tabular-nums text-slate-600">${formatMoneyVND(totalSpecial)}</td>
                <td class="text-right font-mono font-medium tabular-nums text-rose-600">${formatMoneyVND(totalAdv)}</td>
                <td class="text-right font-mono font-black tabular-nums text-emerald-700 bg-emerald-50/80">${formatMoneyVND(totalNet)}</td>
                <td class="text-center font-mono font-bold tabular-nums">${avgOtp}%</td>
                <td class="text-center font-mono font-black tabular-nums ${totalIncidents > 0 ? 'text-rose-700' : 'text-slate-400'}">${totalIncidents}</td>
            </tr>
        `;
    }
}

function toggleReport9Sort(col) {
    if (rep9SortCol === col) {
        rep9SortAsc = !rep9SortAsc;
    } else {
        rep9SortCol = col;
        rep9SortAsc = false;
    }
    applyReport9Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 10: QUỸ TẠM ỨNG ĐIỀU VẬN (KẾ TOÁN QUẢN LÝ)
// -------------------------------------------------------------
function renderReport10(data) {
    const r10 = data.report10_dispatcher_funds || {};

    const elGranted = document.getElementById('rep10-stat-funds-granted');
    if (elGranted) elGranted.innerText = formatMoneyVND(r10.total_funds_granted || 0);

    const elCount = document.getElementById('rep10-stat-funds-count');
    if (elCount) elCount.innerText = `${r10.active_funds_count || 0} gói quỹ đang lưu hành · ${r10.settled_funds_count || 0} đã quyết toán`;

    const elDisbursed = document.getElementById('rep10-stat-disbursed');
    if (elDisbursed) elDisbursed.innerText = formatMoneyVND(r10.total_disbursed || 0);

    const elSettled = document.getElementById('rep10-stat-settled');
    if (elSettled) elSettled.innerText = formatMoneyVND(r10.total_settled_spent || 0);

    const elRefunds = document.getElementById('rep10-stat-refunds');
    if (elRefunds) elRefunds.innerText = `Thu hồi tiền thừa: ${formatMoneyVND(r10.total_refunds_returned || 0)}`;

    const elBalance = document.getElementById('rep10-stat-balance');
    if (elBalance) elBalance.innerText = formatMoneyVND(r10.remaining_balance_total || 0);

    rep10DataCache = r10.funds || [];
    applyReport10Filters();
}

function applyReport10Filters() {
    const searchVal = (document.getElementById('filter-rep10-search')?.value || '').toLowerCase().trim();

    let list = rep10DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.code || '').toLowerCase().includes(searchVal) ||
               (item.dispatcher_name || '').toLowerCase().includes(searchVal) ||
               (item.dispatcher_code || '').toLowerCase().includes(searchVal) ||
               (item.notes || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep10SortCol];
        let valB = b[rep10SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep10SortAsc ? -1 : 1;
        if (valA > valB) return rep10SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep10-tbody');
    const tfoot = document.getElementById('rep10-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy gói Quỹ Điều Vận nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalAmount = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDisbursed = list.reduce((sum, item) => sum + (Number(item.disbursed_amount) || 0), 0);
    const totalSettled = list.reduce((sum, item) => sum + (Number(item.settled_amount) || 0), 0);
    const totalRefunds = list.reduce((sum, item) => sum + (Number(item.refunds_returned) || 0), 0);
    const totalBalance = list.reduce((sum, item) => sum + (Number(item.remaining_balance) || 0), 0);
    const avgUtil = totalAmount > 0 ? ((totalDisbursed / totalAmount) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = list.map((item, index) => {
        let statusBadge = '';
        if (item.status === 'APPROVED' || item.status === 'ACTIVE') {
            statusBadge = '<span class="text-xs font-bold text-indigo-700 uppercase">Đang lưu hành</span>';
        } else if (item.status === 'SETTLED') {
            statusBadge = '<span class="text-xs font-bold text-emerald-700 uppercase">Đã quyết toán</span>';
        } else if (item.status === 'PENDING') {
            statusBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Chờ duyệt xuất</span>';
        } else {
            const sLabel = item.status_label || (item.status === 'ACTIVE' ? 'Đang lưu hành' : item.status) || '—';
            statusBadge = `<span class="text-xs font-semibold text-slate-700 uppercase">${escapeHtml(sLabel)}</span>`;
        }

        const utilPercent = Math.min(100, Math.max(0, item.utilization_rate || 0));
        let barColor = 'bg-teal-600';
        if (utilPercent > 85) barColor = 'bg-rose-500';
        else if (utilPercent > 60) barColor = 'bg-amber-500';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-mono font-bold text-indigo-800 text-xs flex items-center gap-1.5">
                    <i class="ph-bold ph-wallet text-indigo-600"></i>
                    <span>${escapeHtml(item.code)}</span>
                </td>
                <td class="font-bold text-slate-800 text-xs">
                    <div>${escapeHtml(item.dispatcher_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.dispatcher_code)}</div>
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.advance_date)}</td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${formatMoneyVND(item.amount)}</td>
                <td class="text-right text-xs font-bold text-amber-700 tabular-nums">${formatMoneyVND(item.disbursed_amount)}</td>
                <td class="text-center align-middle">
                    <div class="flex items-center gap-2 justify-center">
                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div class="${barColor} h-1.5 rounded-full" style="width: ${utilPercent}%"></div>
                        </div>
                        <span class="text-[11px] font-bold text-slate-700 tabular-nums">${item.utilization_rate}%</span>
                    </div>
                </td>
                <td class="text-right text-xs text-slate-700 tabular-nums">${formatMoneyVND(item.settled_amount)}</td>
                <td class="text-right text-xs text-emerald-700 tabular-nums font-medium">${formatMoneyVND(item.refunds_returned)}</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums bg-teal-50/50">${formatMoneyVND(item.remaining_balance)}</td>
                <td class="text-center text-xs">${statusBadge}</td>
                <td class="text-xs text-slate-600">
                    <div>${escapeHtml(item.approved_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.approved_at)}</div>
                </td>
                <td class="text-xs text-slate-500 max-w-xs truncate" title="${escapeHtml(item.notes || item.settlement_notes || '')}">
                    ${escapeHtml(item.settlement_notes || item.notes || '-')}
                </td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="4" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Gói Quỹ Điều Vận</td>
                <td class="text-right font-mono font-black tabular-nums text-slate-900">${formatMoneyVND(totalAmount)}</td>
                <td class="text-right font-mono font-black tabular-nums text-amber-700">${formatMoneyVND(totalDisbursed)}</td>
                <td class="text-center font-mono font-bold tabular-nums">${avgUtil}%</td>
                <td class="text-right font-mono font-bold tabular-nums text-slate-700">${formatMoneyVND(totalSettled)}</td>
                <td class="text-right font-mono font-bold tabular-nums text-emerald-700">${formatMoneyVND(totalRefunds)}</td>
                <td class="text-right font-mono font-black tabular-nums text-teal-800 bg-teal-50/80">${formatMoneyVND(totalBalance)}</td>
                <td colspan="3"></td>
            </tr>
        `;
    }
}

function toggleReport10Sort(col) {
    if (rep10SortCol === col) {
        rep10SortAsc = !rep10SortAsc;
    } else {
        rep10SortCol = col;
        rep10SortAsc = false;
    }
    applyReport10Filters();
}
