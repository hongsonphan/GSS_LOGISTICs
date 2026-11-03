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
            : (item.saved_voucher_code
                ? '<span class="text-xs font-bold text-sky-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-floppy-disk"></i> Đã lưu QT (chờ duyệt)</span>'
                : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-clock"></i> Đang tạm ứng</span>');

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
            : (item.saved_voucher_code
                ? '<span class="text-xs font-bold text-sky-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-floppy-disk"></i> Đã lưu QT (chờ duyệt)</span>'
                : '<span class="text-xs font-bold text-amber-700 uppercase flex items-center gap-1 justify-center"><i class="ph-bold ph-hourglass"></i> Chưa Chốt</span>');

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
