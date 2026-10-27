// -------------------------------------------------------------
// RENDER BÁO CÁO 1: HIỆU SUẤT ĐỘI XE & P&L ĐẦU XE
// -------------------------------------------------------------
function renderReport1(data) {
    const s = data.summary || {};
    const r1 = data.report1_fleet_utilization || {};

    // 1. Thẻ Doanh thu vận tải
    const elRev = document.getElementById('rep1-stat-revenue');
    if (elRev) elRev.innerText = formatMoneyVND(s.total_revenue || r1.total_revenue || 0);

    // 2. Thẻ Sản lượng đội xe (Số Chuyến · Số Cont)
    const elVol = document.getElementById('rep1-stat-volume');
    const totalTrips = r1.total_trips || s.total_trips || 0;
    const totalConts = r1.total_containers || totalTrips;
    if (elVol) elVol.innerText = `${totalTrips} Chuyến · ${totalConts} Cont`;

    const elNoteOwned = document.getElementById('rep1-note-owned');
    if (elNoteOwned) elNoteOwned.innerText = `Xe Nhà: ${r1.owned_trips || 0} chuyến · Xe Bạn / 3PL: ${r1.partner_trips || 0} chuyến`;

    // 3. Thẻ Doanh thu bình quân / chuyến và / cont
    const avgRevTrip = r1.avg_revenue_per_trip || (totalTrips > 0 ? Math.round((s.total_revenue || 0) / totalTrips) : 0);
    const avgRevCont = r1.avg_revenue_per_container || (totalConts > 0 ? Math.round((s.total_revenue || 0) / totalConts) : 0);
    const elAvgRev = document.getElementById('rep1-stat-avg-rev');
    if (elAvgRev) elAvgRev.innerText = `${formatMoneyVND(avgRevTrip)} / Chuyến`;
    const elAvgCont = document.getElementById('rep1-stat-avg-cont');
    if (elAvgCont) elAvgCont.innerText = `BQ: ${formatMoneyVND(avgRevCont)} / Cont`;

    // 4. Thẻ Chi phí phát sinh hiện trường
    const elExp = document.getElementById('rep1-stat-expense');
    if (elExp) elExp.innerText = formatMoneyVND(s.total_expense || r1.total_expense || 0);

    rep1DataCache = r1.fleet_pnl || [];
    applyReport1Filters();
}

function applyReport1Filters() {
    const searchVal = (document.getElementById('filter-rep1-search')?.value || '').toLowerCase().trim();
    const settlementVal = document.getElementById('filter-rep1-settlement')?.value || '';
    let list = rep1DataCache.filter(item => {
        if (settlementVal === 'SETTLED' && (item.settled_trips_count || 0) === 0) return false;
        if (settlementVal === 'PENDING' && (item.pending_settlement_trips_count || 0) === 0) return false;
        if (!searchVal) return true;
        return (item.plate || '').toLowerCase().includes(searchVal) ||
               (item.vehicle_type || '').toLowerCase().includes(searchVal) ||
               (item.ownership || '').toLowerCase().includes(searchVal);
    });

    rep1DataFiltered = list;
    // Sắp xếp
    list.sort((a, b) => {
        let valA = a[rep1SortCol];
        let valB = b[rep1SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep1SortAsc ? -1 : 1;
        if (valA > valB) return rep1SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep1-pnl-tbody');
    const tfoot = document.getElementById('rep1-pnl-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu đầu xe phù hợp với kỳ và bộ lọc này</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    // Tính tổng cộng
    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalConts = list.reduce((sum, item) => sum + (Number(item.containers_count || item.trips_count) || 0), 0);
    const totalRev = list.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const totalExp = list.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
    const overallAvgPerTrip = totalTrips > 0 ? Math.round(totalRev / totalTrips) : 0;
    const overallAvgPerCont = totalConts > 0 ? Math.round(totalRev / totalConts) : 0;

tbody.innerHTML = list.map((item, index) => {
        const isOwned = item.ownership_code === 'OWNED';
        const ownershipBadge = isOwned
            ? `<span class="text-xs font-bold text-teal-700 uppercase">Xe Nhà</span>`
            : `<span class="text-xs font-semibold text-slate-600 uppercase">Xe Bạn / 3PL</span>`;
        
        const revDisplay = formatMoneyVND(item.revenue);
        const expDisplay = formatMoneyVND(item.expense);
        const contsCount = item.containers_count || item.trips_count;
        const shareDisplay = totalRev > 0 ? Math.round((item.revenue / totalRev) * 100) + '%' : '0%';
        const avgPerTripDisplay = formatMoneyVND(item.avg_revenue_per_trip || (item.trips_count > 0 ? Math.round(item.revenue / item.trips_count) : 0));
        const avgPerContDisplay = formatMoneyVND(item.avg_revenue_per_container || (contsCount > 0 ? Math.round(item.revenue / contsCount) : 0));
        const trips = item.trips || [];
        const displayTrips = settlementVal === 'SETTLED' 
            ? trips.filter(t => Boolean(t.is_settled || t.settlement_status === 'Đã đối soát'))
            : (settlementVal === 'PENDING' 
                ? trips.filter(t => !Boolean(t.is_settled || t.settlement_status === 'Đã đối soát'))
                : trips);
        const nestedTripsTable = renderNestedTripsTableHtml(displayTrips, 'VEHICLE', item.plate);

        return `
            <tr id="rep1-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport1VehicleRow(${index})" title="Nhấp để xem danh sách chuyến xe của ${escapeHtml(item.plate)} ngay dưới bảng">
                <td data-col-key="stt" class="text-center font-bold text-slate-500 text-[13px]">
                    <div class="flex items-center justify-center gap-1">
                        <i id="rep1-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                        <span>${index + 1}</span>
                    </div>
                </td>
                <td data-col-key="plate" class="font-black text-teal-800 text-[13px] group-hover:text-teal-600 transition-colors">
                    <div class="flex items-center gap-1.5">
                        <span class="font-mono">${escapeHtml(item.plate)}</span>
                        <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                    </div>
                </td>
                <td data-col-key="vehicle_type" class="text-[13px] text-slate-600">${escapeHtml(item.vehicle_type)}</td>
                <td data-col-key="ownership">${ownershipBadge}</td>
                <td data-col-key="settlement_status" class="text-center font-bold text-slate-800 text-[13px] tabular-nums">
                    ${Number(item.settled_trips_count) || 0}/${Number(item.trips_count) || 0}
                </td>
                <td data-col-key="trips_count" class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                <td data-col-key="containers_count" class="text-center font-black text-teal-800 text-[13px] tabular-nums bg-teal-50/40">${contsCount}</td>
                <td data-col-key="revenue" class="text-right font-black text-slate-900 text-[13px] tabular-nums">${canViewFinance ? revDisplay : '***'}</td>
                <td data-col-key="revenue_share" class="text-center font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? shareDisplay : '***'}</td>
                <td data-col-key="avg_revenue_per_trip" class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${canViewFinance ? avgPerTripDisplay : '***'}</td>
                <td data-col-key="avg_revenue_per_container" class="text-right font-bold text-indigo-700 text-[13px] tabular-nums">${canViewFinance ? avgPerContDisplay : '***'}</td>
                <td data-col-key="expense" class="text-right font-medium text-amber-700 text-[13px] tabular-nums">${canViewFinance ? expDisplay : '***'}</td>
            </tr>
            <tr id="rep1-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                <td colspan="11" class="p-3 sm:p-4 bg-teal-50/20">
                    <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                            <span class="font-bold text-slate-800">Danh Sách Chuyến Xe Của Đầu Xe:</span>
                            <span class="font-black text-teal-800 font-mono text-sm">${escapeHtml(item.plate)}</span>
                            <span class="text-slate-500">(${escapeHtml(item.vehicle_type)} · ${item.ownership || 'Xe Nhà'} · Tài xế: ${escapeHtml(item.driver || '-')})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('VEHICLE', ${index})" class="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer" title="Mở bảng kê chi tiết toàn bộ các chuyến xe của đầu xe này trên toàn màn hình">
                                <i class="ph-bold ph-arrows-out-simple"></i> Mở Trang Chi Tiết
                            </button>
                            <button type="button" onclick="event.stopPropagation(); toggleReport1VehicleRow(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
                                <i class="ph-bold ph-caret-up"></i> Thu gọn
                            </button>
                        </div>
                    </div>
                    ${nestedTripsTable}
                </td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-[13.5px]">
                <td data-col-key="stt" class="text-center font-black text-slate-900 uppercase text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">TỔNG</td>
                <td data-col-key="plate" class="py-3 px-3 font-black text-slate-900 uppercase text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${list.length} Đầu Xe</td>
                <td data-col-key="vehicle_type" class="text-center text-slate-400 font-normal text-[13.5px]" style="font-size: 13.5px !important; font-family: 'Plus Jakarta Sans', sans-serif !important;"></td>
                <td data-col-key="ownership" class="text-center text-slate-400 font-normal text-[13.5px]" style="font-size: 13.5px !important; font-family: 'Plus Jakarta Sans', sans-serif !important;"></td>
                <td data-col-key="settlement_status" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">
                    ${list.reduce((sum, item) => sum + (Number(item.settled_trips_count) || 0), 0)}/${totalTrips}
                </td>
                <td data-col-key="trips_count" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${totalTrips}</td>
                <td data-col-key="containers_count" class="text-center font-black tabular-nums text-teal-900 bg-teal-100/60 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${totalConts}</td>
                <td data-col-key="revenue" class="text-right font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                <td data-col-key="revenue_share" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${canViewFinance ? '100%' : '***'}</td>
                <td data-col-key="avg_revenue_per_trip" class="text-right font-black tabular-nums text-emerald-800 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${canViewFinance ? formatMoneyVND(overallAvgPerTrip) : '***'}</td>
                <td data-col-key="avg_revenue_per_container" class="text-right font-black tabular-nums text-indigo-800 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${canViewFinance ? formatMoneyVND(overallAvgPerCont) : '***'}</td>
                <td data-col-key="expense" class="text-right font-black tabular-nums text-amber-800 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
            </tr>
        `;
        if (window.BimTableColumnManager && window.BimTableColumnManager.instances && window.BimTableColumnManager.instances['rep1-pnl-table']) {
            window.BimTableColumnManager.instances['rep1-pnl-table'].apply();
        }
    }
}

function toggleReport1Sort(col) {
    if (rep1SortCol === col) {
        rep1SortAsc = !rep1SortAsc;
    } else {
        rep1SortCol = col;
        rep1SortAsc = false;
    }
    applyReport1Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 2: CHU TRÌNH VỎ CONTAINER & DEM/DET
// -------------------------------------------------------------
function renderReport2(data) {
    const r2 = data.report2_container_dem_det || {};

    const elSafe = document.getElementById('rep2-stat-safe');
    if (elSafe) elSafe.innerText = `${r2.safe_count || 0} Cont`;

    const elWarn = document.getElementById('rep2-stat-warning');
    if (elWarn) elWarn.innerText = `${r2.warning_count || 0} Cont`;

    const elOverdue = document.getElementById('rep2-stat-overdue');
    if (elOverdue) elOverdue.innerText = `${r2.overdue_count || 0} Cont`;

    const elFines = document.getElementById('rep2-stat-fines');
    if (elFines) elFines.innerText = `Ước tính tiền phạt: ${formatMoneyVND(r2.estimated_fines || 0)}`;

    // Render Bảng Ma trận Hãng Tàu (Shipping Lines Summary)
    const slTbody = document.getElementById('rep2-shipping-lines-tbody');
    const slTfoot = document.getElementById('rep2-shipping-lines-tfoot');
    if (slTbody) {
        const slList = r2.shipping_lines_summary || [];
        if (slList.length === 0) {
            slTbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 font-medium">Chưa có dữ liệu hãng tàu trong kỳ này</td></tr>`;
            if (slTfoot) slTfoot.innerHTML = '';
        } else {
            const sumConts = slList.reduce((sum, item) => sum + (Number(item.total_containers) || 0), 0);
            const sumSafe = slList.reduce((sum, item) => sum + (Number(item.safe_count) || 0), 0);
            const sumWarn = slList.reduce((sum, item) => sum + (Number(item.warning_count) || 0), 0);
            const sumOverdue = slList.reduce((sum, item) => sum + (Number(item.overdue_count) || 0), 0);
            const sumFines = slList.reduce((sum, item) => sum + (Number(item.estimated_fines) || 0), 0);

            slTbody.innerHTML = slList.map((sl, index) => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                    <td class="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <i class="ph-bold ph-boat text-teal-700"></i>
                        <span>${escapeHtml(sl.shipping_line)}</span>
                    </td>
                    <td class="text-center font-mono font-bold text-slate-900 text-xs">${sl.total_containers}</td>
                    <td class="text-center font-mono font-bold text-emerald-700 text-xs">${sl.safe_count}</td>
                    <td class="text-center font-mono font-bold text-amber-700 text-xs">${sl.warning_count > 0 ? `<span class="font-bold text-amber-700">${sl.warning_count}</span>` : '0'}</td>
                    <td class="text-center font-mono font-bold text-rose-700 text-xs">${sl.overdue_count > 0 ? `<span class="font-black text-rose-700">${sl.overdue_count}</span>` : '0'}</td>
                    <td class="text-right font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(sl.estimated_fines)}</td>
                </tr>
            `).join('');

            if (slTfoot) {
                slTfoot.innerHTML = `
                    <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                        <td colspan="2" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${slList.length} Hãng Tàu</td>
                        <td class="text-center font-mono font-black tabular-nums">${sumConts}</td>
                        <td class="text-center font-mono font-black text-emerald-700 tabular-nums">${sumSafe}</td>
                        <td class="text-center font-mono font-black text-amber-700 tabular-nums">${sumWarn}</td>
                        <td class="text-center font-mono font-black text-rose-700 tabular-nums">${sumOverdue}</td>
                        <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(sumFines)}</td>
                    </tr>
                `;
            }
        }
    }

    rep2DataCache = r2.containers || [];
    applyReport2Filters();
}

function applyReport2Filters() {
    const searchVal = (document.getElementById('filter-rep2-search')?.value || '').toLowerCase().trim();
    let list = rep2DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.shipping_line || '').toLowerCase().includes(searchVal) ||
               (item.location_type || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep2SortCol];
        let valB = b[rep2SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep2SortAsc ? -1 : 1;
        if (valA > valB) return rep2SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep2-tbody');
    const tfoot = document.getElementById('rep2-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy vỏ container nào trong kỳ theo dõi này</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalFines = list.reduce((sum, item) => sum + (Number(item.estimated_fines) || 0), 0);

    tbody.innerHTML = list.map((item, index) => {
        let statusBadge = '';
        if (item.det_status === 'OVERDUE') {
            statusBadge = `<span class="text-xs font-bold text-rose-700 uppercase">Quá hạn (${Math.abs(item.days_left)} ngày)</span>`;
        } else if (item.det_status === 'WARNING') {
            statusBadge = `<span class="text-xs font-bold text-amber-700 uppercase">Còn ${item.days_left} ngày</span>`;
        } else {
            statusBadge = `<span class="text-xs font-bold text-emerald-700 uppercase">An toàn</span>`;
        }

        const finesFormatted = item.estimated_fines > 0
            ? `<span class="font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(item.estimated_fines)}</span>`
            : `<span class="text-slate-400 text-xs">-</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td class="font-black text-slate-900 font-mono text-xs">${escapeHtml(item.container_number)} <span class="text-[10px] text-slate-400 font-normal">(${item.container_type})</span></td>
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-medium text-slate-600">${escapeHtml(item.shipping_line)}</td>
                <td class="text-xs text-slate-600">${escapeHtml(item.location_type)}</td>
                <td class="text-center font-bold text-slate-700 text-xs tabular-nums">${item.det_free_days || 5} ngày</td>
                <td class="text-xs font-medium text-slate-700 tabular-nums">${escapeHtml(item.det_expiry_date)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-right">${finesFormatted}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="9" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Vỏ Container Theo Dõi</td>
                <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(totalFines)}</td>
            </tr>
        `;
    }
}

function toggleReport2Sort(col) {
    if (rep2SortCol === col) {
        rep2SortAsc = !rep2SortAsc;
    } else {
        rep2SortCol = col;
        rep2SortAsc = false;
    }
    applyReport2Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 3: ĐÚNG GIỜ & CHẤT LƯỢNG DỊCH VỤ (OTP / SLA)
// -------------------------------------------------------------
function renderReport3(data) {
    const r3 = data.report3_on_time_performance || {};

    const elOtp = document.getElementById('rep3-stat-otp');
    if (elOtp) elOtp.innerText = `${r3.otp_rate || 0.0}%`;

    const elPickup = document.getElementById('rep3-stat-pickup');
    if (elPickup) elPickup.innerText = `${r3.pickup_on_time || 0} Chuyến`;

    const elArrival = document.getElementById('rep3-stat-arrival');
    if (elArrival) elArrival.innerText = `${r3.arrival_on_time || 0} Chuyến`;

    const elClosing = document.getElementById('rep3-stat-closing');
    if (elClosing) elClosing.innerText = `${r3.closing_on_time || 0} Chuyến`;

    rep3DataCache = r3.trips || [];
    applyReport3Filters();
}

function applyReport3Filters() {
    const searchVal = (document.getElementById('filter-rep3-search')?.value || '').toLowerCase().trim();
    let list = rep3DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.route || '').toLowerCase().includes(searchVal) ||
               (item.driver_name || '').toLowerCase().includes(searchVal) ||
               (item.delay_reason || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep3SortCol];
        let valB = b[rep3SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep3SortAsc ? -1 : 1;
        if (valA > valB) return rep3SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep3-tbody');
    const tfoot = document.getElementById('rep3-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu vận hành trong kỳ đã chọn</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const onTimeCount = list.filter(i => i.is_on_time).length;
    const otpPercent = list.length > 0 ? ((onTimeCount / list.length) * 100).toFixed(1) : '0.0';

    tbody.innerHTML = list.map((item, index) => {
        const onTimeBadge = item.is_on_time
            ? `<span class="text-xs font-bold text-emerald-700 uppercase">Đúng Hẹn</span>`
            : `<span class="text-xs font-bold text-rose-700 uppercase">Trễ Hẹn</span>`;

        const reasonText = !item.is_on_time
            ? `<span class="text-xs font-semibold text-rose-700">${escapeHtml(item.delay_reason)}</span>`
            : `<span class="text-slate-400 text-xs">-</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.route)}">${escapeHtml(item.route)}</td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_name)} <span class="font-mono text-slate-400 font-normal">(${escapeHtml(item.vehicle)})</span></td>
                <td class="text-xs font-mono text-slate-800">${escapeHtml(item.loading_time)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.gate_in_time)}</td>
                <td class="text-xs font-mono text-slate-500">${escapeHtml(item.closing_time)}</td>
                <td class="text-center">${onTimeBadge}</td>
                <td>${reasonText}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="8" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Chuyến Vận Hành</td>
                <td class="text-center font-mono font-black text-emerald-700 tabular-nums">${otpPercent}% ĐÚNG HẸN (${onTimeCount}/${list.length})</td>
                <td class="text-center font-mono font-bold text-rose-700 tabular-nums">${list.length - onTimeCount} Trễ hẹn</td>
            </tr>
        `;
    }
}

function toggleReport3Sort(col) {
    if (rep3SortCol === col) {
        rep3SortAsc = !rep3SortAsc;
    } else {
        rep3SortCol = col;
        rep3SortAsc = false;
    }
    applyReport3Filters();
}
