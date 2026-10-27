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


// -------------------------------------------------------------
// RENDER BÁO CÁO 11: TẠM ỨNG & CHI PHÍ PHÁT SINH TÀI XẾ (ĐIỀU VẬN QUẢN LÝ)
// -------------------------------------------------------------
function renderReport11(data) {
    const r11 = data.report11_driver_advances_expenses || {};

    const elAdvances = document.getElementById('rep11-stat-advances');
    if (elAdvances) elAdvances.innerText = formatMoneyVND(r11.total_driver_advances || 0);

    const elPendingTrips = document.getElementById('rep11-stat-pending-trips');
    if (elPendingTrips) elPendingTrips.innerText = `${r11.pending_settlement_count || 0} chuyến đang chờ hoàn ứng · ${r11.settled_count || 0} đã chốt`;

    const elActualExp = document.getElementById('rep11-stat-actual-expenses');
    if (elActualExp) elActualExp.innerText = formatMoneyVND(r11.total_actual_expenses || 0);

    const elRefund = document.getElementById('rep11-stat-refund-due');
    if (elRefund) elRefund.innerText = formatMoneyVND(r11.total_refund_due || 0);

    const elReimburse = document.getElementById('rep11-stat-reimburse-due');
    if (elReimburse) elReimburse.innerText = formatMoneyVND(r11.total_reimburse_due || 0);

    rep11DataCache = r11.trips || [];
    applyReport11Filters();
}

function applyReport11Filters() {
    const searchVal = (document.getElementById('filter-rep11-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep11-status')?.value || 'ALL';

    let list = rep11DataCache.filter(item => {
        // Lọc trạng thái
        if (statusVal === 'PENDING' && item.is_settled) return false;
        if (statusVal === 'SETTLED' && !item.is_settled) return false;

        // Tìm kiếm từ khóa
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.advance_code || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.license_plate || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep11SortCol];
        let valB = b[rep11SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep11SortAsc ? -1 : 1;
        if (valA > valB) return rep11SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep11-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe nào phát sinh tạm ứng hoặc chi phí trong kỳ</td></tr>`;
        const tfoot = document.getElementById('rep11-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalAdv = list.reduce((sum, item) => sum + (parseFloat(item.advance_amount) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.actual_expenses) || 0), 0);
    const totalBot = list.reduce((sum, item) => sum + (parseFloat(item.bot_expense) || 0), 0);
    const totalPort = list.reduce((sum, item) => sum + (parseFloat(item.port_lift_expense) || 0), 0);
    const totalDep = list.reduce((sum, item) => sum + (parseFloat(item.deposit_expense) || 0), 0);
    const totalDiff = totalAdv - totalExp;
    const totalDocs = list.reduce((sum, item) => sum + (parseInt(item.documents_count) || 0), 0);

    const tfoot = document.getElementById('rep11-tfoot');
    if (tfoot) {
        let diffColor = 'text-slate-800';
        let diffText = '0 đ';
        if (totalDiff > 0) {
            diffColor = 'text-emerald-700 font-black';
            diffText = `+ ${formatMoneyVND(totalDiff)}`;
        } else if (totalDiff < 0) {
            diffColor = 'text-rose-700 font-black';
            diffText = `- ${formatMoneyVND(Math.abs(totalDiff))}`;
        }
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="7" class="text-right uppercase">TỔNG CỘNG: ${list.length} Chuyến Tạm Ứng:</td>
                <td class="text-right text-indigo-800 font-mono font-black tabular-nums">${formatMoneyVND(totalAdv)}</td>
                <td class="text-right text-rose-700 font-mono font-black tabular-nums">${formatMoneyVND(totalExp)}</td>
                <td class="text-right text-[11px] text-slate-700 tabular-nums">
                    <span class="px-1.5 py-0.5 bg-slate-200/80 rounded font-bold">BOT: ${formatMoneyVND(totalBot)}</span>
                    <span class="px-1.5 py-0.5 bg-slate-200/80 rounded font-bold ml-1">Cảng: ${formatMoneyVND(totalPort)}</span>
                    ${totalDep > 0 ? `<span class="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold ml-1">Cược: ${formatMoneyVND(totalDep)}</span>` : ''}
                </td>
                <td class="text-right font-mono font-black text-xs tabular-nums ${diffColor}">${diffText}</td>
                <td colspan="2" class="text-center"></td>
                <td class="text-center font-bold text-teal-800">${totalDocs > 0 ? `<i class="ph-bold ph-receipt mr-0.5"></i>${totalDocs}` : '-'}</td>
                <td></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map((item, index) => {
        let diffColor = 'text-slate-600';
        let diffText = '0 đ';
        if (item.difference > 0) {
            diffColor = 'text-emerald-700 bg-emerald-50/70 font-black';
            diffText = `+ ${formatMoneyVND(item.difference)}`;
        } else if (item.difference < 0) {
            diffColor = 'text-rose-700 bg-rose-50/70 font-black';
            diffText = `- ${formatMoneyVND(item.difference_abs)}`;
        }

        let actionBadge = '';
        if (item.settlement_action === 'REFUND') {
            actionBadge = '<span class="text-xs font-bold text-emerald-700 uppercase">Tài xế nộp lại</span>';
        } else if (item.settlement_action === 'REIMBURSE') {
            actionBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Cty/ĐV chi bù</span>';
        } else {
            actionBadge = '<span class="text-xs font-semibold text-slate-600 uppercase">Khớp đúng</span>';
        }

        const statusBadge = item.is_settled
            ? '<span class="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã hoàn ứng</span>'
            : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-clock"></i> Đang tạm ứng</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                    ${item.advance_code && item.advance_code !== '-' ? `<div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.advance_code)}</div>` : ''}
                </td>
                <td class="font-bold text-slate-800 text-xs">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-600 max-w-[180px] truncate" title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                    <div class="text-[10px] font-mono font-bold text-teal-800 mt-0.5">${escapeHtml(item.license_plate)}</div>
                </td>
                <td class="text-center text-xs font-mono text-slate-600">${escapeHtml(item.advance_date)}</td>
                <td class="text-xs text-slate-600">
                    <span class="text-xs text-slate-700 font-medium">${escapeHtml(item.advance_source)}</span>
                </td>
                <td class="text-right text-xs font-bold text-indigo-800 tabular-nums">${formatMoneyVND(item.advance_amount)}</td>
                <td class="text-right text-xs font-bold text-rose-700 tabular-nums">${formatMoneyVND(item.actual_expenses)}</td>
                <td class="text-right text-[11px] text-slate-600 tabular-nums">
                    <span title="Vé cầu đường BOT" class="text-slate-700 font-medium">BOT: ${formatMoneyVND(item.bot_expense)}</span>
                    <span title="Nâng / hạ bãi cảng" class="text-slate-700 font-medium ml-1">· Cảng: ${formatMoneyVND(item.port_lift_expense)}</span>
                    ${item.deposit_expense > 0 ? `<span title="Cược vỏ cont" class="text-amber-800 font-medium ml-1">· Cược: ${formatMoneyVND(item.deposit_expense)}</span>` : ''}
                </td>
                <td class="text-right text-xs font-bold tabular-nums ${diffColor}">${diffText}</td>
                <td class="text-center text-xs">${actionBadge}</td>
                <td class="text-center text-xs">${statusBadge}</td>
                <td class="text-center text-xs font-bold tabular-nums">
                    ${item.documents_count > 0 
                        ? `<span class="text-xs font-bold text-teal-700 inline-flex items-center gap-1"><i class="ph-bold ph-receipt"></i> ${item.documents_count}</span>` 
                        : '<span class="text-slate-300">-</span>'}
                </td>
                <td class="text-xs text-slate-500">
                    <div>${escapeHtml(item.settled_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.settled_at)}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport11Sort(col) {
    if (rep11SortCol === col) {
        rep11SortAsc = !rep11SortAsc;
    } else {
        rep11SortCol = col;
        rep11SortAsc = false;
    }
    applyReport11Filters();
}


// -------------------------------------------------------------
// RENDER BÁO CÁO 12: BÁO CÁO QUYẾT TOÁN CHUYẾN XE & BACKLOG CHUYỂN KỲ
// -------------------------------------------------------------
function renderReport12(data) {
    const r12 = data.report12_settlement_backlog || {};

    const elTrips = document.getElementById('rep12-stat-trips');
    if (elTrips) elTrips.innerText = `${r12.settled_trips_count || 0} / ${r12.total_trips_count || 0}`;

    const elNoteSettled = document.getElementById('rep12-note-settled');
    if (elNoteSettled) elNoteSettled.innerText = `Đã chốt sổ: ${r12.settled_trips_count || 0} · Chưa chốt: ${r12.unsettled_trips_count || 0}`;

    const elSettledRev = document.getElementById('rep12-stat-settled-rev');
    if (elSettledRev) elSettledRev.innerText = formatMoneyVND(r12.settled_revenue || 0);

    const elSettledProfit = document.getElementById('rep12-stat-settled-profit');
    if (elSettledProfit) elSettledProfit.innerText = `Lợi nhuận chốt: ${formatMoneyVND(r12.settled_profit || 0)}`;

    const elUnsettledRev = document.getElementById('rep12-stat-unsettled-rev');
    if (elUnsettledRev) elUnsettledRev.innerText = formatMoneyVND(r12.unsettled_revenue || 0);

    const elCarryover = document.getElementById('rep12-stat-carryover');
    if (elCarryover) elCarryover.innerText = `${r12.carryover_trips_count || 0} Chuyến`;

    rep12DataCache = r12.trips || [];
    applyReport12Filters();
}

function applyReport12Filters() {
    const searchVal = (document.getElementById('filter-rep12-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('filter-rep12-status')?.value || 'ALL';

    let list = rep12DataCache.filter(item => {
        if (statusVal === 'SETTLED' && !item.is_settled) return false;
        if (statusVal === 'UNSETTLED' && item.is_settled) return false;
        if (statusVal === 'CARRY_OVER' && !item.is_carry_over) return false;
        if (statusVal === 'OWNED' && item.vehicle_ownership !== 'OWNED') return false;
        if (statusVal === 'PARTNER' && item.vehicle_ownership !== 'PARTNER') return false;

        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_plate || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep12SortCol];
        let valB = b[rep12SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep12SortAsc ? -1 : 1;
        if (valA > valB) return rep12SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep12-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy chuyến xe nào khớp bộ lọc</td></tr>`;
        const tfoot = document.getElementById('rep12-tfoot');
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalRev = list.reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (parseFloat(item.expense) || 0), 0);
    const totalReim = list.reduce((sum, item) => sum + (parseFloat(item.reimbursable) || 0), 0);
    const totalProfit = list.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);
    const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

    const tfoot = document.getElementById('rep12-tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="8" class="text-right uppercase">TỔNG CỘNG: ${list.length} Chuyến Vận Tải:</td>
                <td class="text-right text-slate-900 font-mono font-black tabular-nums">${formatMoneyVND(totalRev)}</td>
                <td class="text-right text-rose-700 font-mono font-black tabular-nums">${formatMoneyVND(totalExp)}</td>
                <td class="text-right text-indigo-700 font-mono font-black tabular-nums">${formatMoneyVND(totalReim)}</td>
                <td class="text-right text-emerald-700 font-mono font-black tabular-nums bg-emerald-50/40">${formatMoneyVND(totalProfit)}</td>
                <td class="text-center font-mono font-bold tabular-nums ${parseFloat(avgMargin) >= 20 ? 'text-emerald-700' : 'text-amber-700'}">${avgMargin}%</td>
                <td colspan="4"></td>
            </tr>
        `;
    }

    tbody.innerHTML = list.map((item, index) => {
        const revDisp = formatMoneyVND(item.revenue);
        const expDisp = formatMoneyVND(item.expense);
        const reimDisp = formatMoneyVND(item.reimbursable);
        const profDisp = formatMoneyVND(item.profit);

        let categoryBadge = '';
        if (item.category_tag === 'BACKLOG_SETTLED') {
            categoryBadge = '<span class="text-xs font-bold text-purple-700 uppercase">Tồn T- trước ➔ Đã Q.Toán</span>';
        } else if (item.category_tag === 'BACKLOG_PENDING') {
            categoryBadge = '<span class="text-xs font-bold text-rose-700 uppercase">Tồn T- trước ➔ Nợ Tiếp</span>';
        } else if (item.category_tag === 'CURRENT_SETTLED') {
            categoryBadge = '<span class="text-xs font-bold text-teal-700 uppercase">Trong kỳ ➔ Đã Q.Toán</span>';
        } else {
            categoryBadge = '<span class="text-xs font-bold text-amber-700 uppercase">Trong kỳ ➔ Chưa Chốt</span>';
        }

        const settlementBadge = item.is_settled
            ? '<span class="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-check-circle"></i> Đã Quyết Toán</span>'
            : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-hourglass"></i> Chưa Chốt</span>';

        const podBadge = item.has_pod
            ? '<span class="text-xs font-bold text-emerald-700 uppercase inline-flex items-center gap-1"><i class="ph-bold ph-file-check"></i> Đã Thu POD</span>'
            : '<span class="text-xs font-bold text-rose-700 uppercase inline-flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i> Thiếu POD</span>';

        const ownershipBadge = item.vehicle_ownership === 'OWNED'
            ? '<span class="text-[10px] font-bold text-teal-700 uppercase">Xe Nhà</span>'
            : '<span class="text-[10px] font-bold text-slate-600 uppercase">Xe Bạn</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors ${item.is_carry_over ? 'bg-amber-50/20' : ''}">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewTripDetail('${escapeHtml(item.trip_code)}')" class="font-mono text-teal-800 hover:text-teal-900 underline flex items-center gap-1">
                        <i class="ph-bold ph-truck"></i>
                        <span>${escapeHtml(item.trip_code)}</span>
                    </a>
                    ${item.settlement_batch_code && item.settlement_batch_code !== '-' ? `<div class="text-[10px] text-slate-400 font-mono">Đợt: ${escapeHtml(item.settlement_batch_code)}</div>` : ''}
                </td>
                <td class="text-center text-xs font-mono text-slate-600 font-bold">${escapeHtml(item.loading_date)}</td>
                <td class="text-xs font-bold text-slate-800">
                    <div>${escapeHtml(item.customer_name)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.customer_code)}</div>
                </td>
                <td class="text-xs">
                    <div class="font-bold font-mono text-slate-900 flex items-center gap-1">
                        <span>${escapeHtml(item.vehicle_plate)}</span>
                        ${ownershipBadge}
                    </div>
                    ${item.dropoff_vehicle_plate ? `<div class="text-[10px] font-mono text-slate-500">Hạ: ${escapeHtml(item.dropoff_vehicle_plate)}</div>` : ''}
                </td>
                <td class="text-xs">
                    <div class="font-bold text-slate-900">
                        <span>${escapeHtml(item.driver_name)}</span>
                    </div>
                    ${item.dropoff_driver_name ? `<div class="text-[10px] text-slate-500">TX Hạ: ${escapeHtml(item.dropoff_driver_name)}</div>` : ''}
                </td>
                <td class="text-xs text-slate-600 max-w-[200px] truncate">
                    <div title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</div>
                    <div class="text-[10px] font-mono text-slate-500">Cont: ${escapeHtml(item.container_number)}</div>
                </td>
                <td class="text-right text-xs font-bold text-slate-900 tabular-nums">${revDisp}</td>
                <td class="text-right text-xs text-rose-700 tabular-nums">${expDisp}</td>
                <td class="text-right text-xs text-indigo-700 tabular-nums">${reimDisp}</td>
                <td class="text-right text-xs font-black text-emerald-700 tabular-nums bg-emerald-50/40">${profDisp}</td>
                <td class="text-center text-xs font-bold tabular-nums ${item.margin_percent >= 20 ? 'text-emerald-700' : 'text-amber-700'}">${item.margin_percent}%</td>
                <td class="text-center text-xs">${podBadge}</td>
                <td class="text-center text-xs">${categoryBadge}</td>
                <td class="text-center text-xs">${settlementBadge}</td>
                <td class="text-xs text-slate-500">
                    <div>${escapeHtml(item.settled_by || '-')}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(item.settled_at)}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleReport12Sort(col) {
    if (rep12SortCol === col) {
        rep12SortAsc = !rep12SortAsc;
    } else {
        rep12SortCol = col;
        rep12SortAsc = false;
    }
    applyReport12Filters();
}

function toggleReport13Sort(col) {
    if (rep13SortCol === col) {
        rep13SortAsc = !rep13SortAsc;
    } else {
        rep13SortCol = col;
        rep13SortAsc = false;
    }
    applyReport13Filters();
}


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
