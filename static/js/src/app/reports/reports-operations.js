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

// -------------------------------------------------------------
// RENDER BÁO CÁO 4: ĐỐI SOÁT CHI PHÍ TUYẾN & HOÀN CHI HỘ
// -------------------------------------------------------------
// =========================================================================
// BÁO CÁO 4: CHI PHÍ PHÁT SINH TUYẾN (THEO XE, THEO TÀI & THEO KHÁCH HÀNG)
// =========================================================================
function renderReport4(data) {
    const r4 = data.report4_expenses_reimbursement || {};

    // 1. Cập nhật 4 thẻ KPI đỉnh trang
    const totalCost = r4.total_cost || 0;
    const totalBot = r4.total_bot || 0;
    const totalLift = r4.total_port_lift || 0;
    const totalReimb = r4.total_reimbursable || 0;
    const collectedReimb = r4.total_reimbursable_collected || 0;
    const pendingReimb = r4.pending_reimbursement || (totalReimb - collectedReimb);

    const elTotal = document.getElementById('rep4-stat-total-cost');
    if (elTotal) elTotal.innerText = canViewFinance ? formatMoneyVND(totalCost) : '***';

    const elTotalSub = document.getElementById('rep4-stat-total-sub');
    if (elTotalSub) {
        const totalTrips = (r4.routes || []).reduce((s, r) => s + (Number(r.trips_count) || 0), 0);
        const avgCost = totalTrips > 0 ? Math.round(totalCost / totalTrips) : 0;
        elTotalSub.innerText = canViewFinance 
            ? `Tổng ${totalTrips} Chuyến xe · Suất CP: ${formatMoneyVND(avgCost)}/chuyến`
            : `Tổng ${totalTrips} Chuyến xe vận chuyển`;
    }

    const elBot = document.getElementById('rep4-stat-bot');
    if (elBot) elBot.innerText = canViewFinance ? formatMoneyVND(totalBot) : '***';

    const elBotSub = document.getElementById('rep4-stat-bot-sub');
    if (elBotSub) {
        const botRatio = totalCost > 0 ? (totalBot / totalCost * 100).toFixed(1) : '0.0';
        elBotSub.innerText = canViewFinance ? `Chiếm ${botRatio}% trên tổng chi phí tuyến` : 'ePass / VETC điện tử qua các trạm';
    }

    const elLift = document.getElementById('rep4-stat-lift');
    if (elLift) elLift.innerText = canViewFinance ? formatMoneyVND(totalLift) : '***';

    const elReimb = document.getElementById('rep4-stat-reimbursable');
    if (elReimb) elReimb.innerText = canViewFinance ? formatMoneyVND(totalReimb) : '***';

    const elReimbSub = document.getElementById('rep4-stat-reimb-sub');
    if (elReimbSub) {
        elReimbSub.innerText = canViewFinance 
            ? `Đã thu: ${formatMoneyVND(collectedReimb)} · Chờ thu: ${formatMoneyVND(pendingReimb)}`
            : 'Khoản chi hộ chờ thu hồi từ khách';
    }

    // 2. Lưu bộ đệm dữ liệu 4 góc nhìn
    rep4RoutesCache = r4.routes || [];
    rep4VehiclesCache = r4.vehicles || [];
    rep4DriversCache = r4.drivers || [];
    rep4CustomersCache = r4.customers || [];
    rep4ItemsCache = r4.items || [];

    // 3. Khởi tạo góc nhìn mặc định
    switchReport4Perspective(rep4ActivePerspective || 'route');
}

function switchReport4Perspective(perspective) {
    rep4ActivePerspective = perspective;

    // Cập nhật trạng thái active của 5 nút tab
    document.querySelectorAll('.rep4-persp-btn').forEach(btn => {
        btn.classList.remove('bg-teal-700', 'text-white', 'shadow-xs');
        btn.classList.add('text-slate-600', 'hover:text-slate-900');
    });
    const activeBtn = document.getElementById(`rep4-persp-${perspective}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
        activeBtn.classList.add('bg-teal-700', 'text-white', 'shadow-xs');
    }

    // Cập nhật tiêu đề bảng
    const titleEl = document.getElementById('rep4-table-title');
    const subtitleEl = document.getElementById('rep4-table-subtitle');
    const searchEl = document.getElementById('filter-rep4-search');

    if (perspective === 'route') {
        if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-path text-teal-700"></i><span>Phân Tích Chi Phí Phát Sinh Theo Tuyến Vận Tải</span>';
        if (subtitleEl) subtitleEl.innerText = 'Nhấp vào dòng tuyến để xem danh sách chuyến xe và chi tiết từng khoản chi phí phát sinh';
        if (searchEl) searchEl.placeholder = 'Tìm tên tuyến vận chuyển...';
        rep4SortCol = 'direct_expense';
    } else if (perspective === 'vehicle') {
        if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-truck text-teal-700"></i><span>Phân Tích Chi Phí Phát Sinh Tuyến Theo Đầu Xe</span>';
        if (subtitleEl) subtitleEl.innerText = 'Nhấp vào dòng xe để xem các chuyến và chi phí của từng phương tiện';
        if (searchEl) searchEl.placeholder = 'Tìm biển số xe, loại xe...';
        rep4SortCol = 'direct_expense';
    } else if (perspective === 'driver') {
        if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-user text-teal-700"></i><span>Phân Tích Chi Phí Hiện Trường Theo Tài Xế</span>';
        if (subtitleEl) subtitleEl.innerText = 'Nhấp vào dòng tài xế để xem các khoản phí hiện trường tài xế đã kê khai';
        if (searchEl) searchEl.placeholder = 'Tìm tên hoặc mã tài xế...';
        rep4SortCol = 'direct_expense';
    } else if (perspective === 'customer') {
        if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-buildings text-teal-700"></i><span>Phân Tích Chi Phí & Hiệu Quả Tuyến Theo Khách Hàng</span>';
        if (subtitleEl) subtitleEl.innerText = 'Nhấp vào dòng khách hàng để đối soát cước vận chuyển, chi phí tuyến và chi hộ';
        if (searchEl) searchEl.placeholder = 'Tìm tên hoặc mã khách hàng...';
        rep4SortCol = 'direct_expense';
    } else if (perspective === 'reimbursable') {
        if (titleEl) titleEl.innerHTML = '<i class="ph-bold ph-receipt text-teal-700"></i><span>Bảng Kê Chi Tiết Các Khoản Chi Hộ Khách Hàng (Debit Note)</span>';
        if (subtitleEl) subtitleEl.innerText = 'Danh sách toàn bộ các khoản chi hộ có số hóa đơn chứng từ chờ thu hồi';
        if (searchEl) searchEl.placeholder = 'Tìm khách hàng, số HĐ, loại phí...';
        rep4SortCol = 'amount';
    }
    rep4SortAsc = false;

    renderReport4Thead();
    applyReport4Filters();
}
window.switchReport4Perspective = switchReport4Perspective;

function renderReport4Thead() {
    const thead = document.getElementById('rep4-thead');
    if (!thead) return;

    if (rep4ActivePerspective === 'route') {
        thead.innerHTML = `
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider font-heading">
                <th class="text-center w-12 font-bold py-2.5">STT</th>
                <th onclick="toggleReport4Sort('route_name')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Tuyến Đường Vận Chuyển</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('trips_count')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Số Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('containers_count')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Số Cont</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('revenue')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Doanh Thu Tuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('direct_expense')" class="cursor-pointer hover:bg-amber-100/50 text-right py-2.5 bg-amber-50/50"><div class="flex items-center justify-end gap-1"><span class="text-amber-900 font-black">Tổng Chi Phí Tuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('bot_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Vé BOT</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('lift_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Nâng Hạ / Bãi</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('reimbursable_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Hộ Khách</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('avg_cost_per_trip')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Phí BQ/Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('cost_ratio')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Tỷ Lệ CP/DT</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
            </tr>
        `;
    } else if (rep4ActivePerspective === 'vehicle') {
        thead.innerHTML = `
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider font-heading">
                <th class="text-center w-12 font-bold py-2.5">STT</th>
                <th onclick="toggleReport4Sort('plate')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Biển Số Xe</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th class="py-2.5">Loại Xe & Sở Hữu</th>
                <th class="py-2.5">Tuyến Chủ Lực</th>
                <th onclick="toggleReport4Sort('trips_count')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Số Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('revenue')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Doanh Thu</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('direct_expense')" class="cursor-pointer hover:bg-amber-100/50 text-right py-2.5 bg-amber-50/50"><div class="flex items-center justify-end gap-1"><span class="text-amber-900 font-black">Tổng Chi Phí Phát Sinh</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('bot_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Vé BOT</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('lift_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Nâng Hạ / Bãi</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('other_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Phí Khác</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('avg_cost_per_trip')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Phí BQ/Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('cost_ratio')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Tỷ Lệ CP/DT</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
            </tr>
        `;
    } else if (rep4ActivePerspective === 'driver') {
        thead.innerHTML = `
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider font-heading">
                <th class="text-center w-12 font-bold py-2.5">STT</th>
                <th onclick="toggleReport4Sort('driver_name')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Họ Tên Tài Xế</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th class="py-2.5">Mã TX</th>
                <th class="py-2.5">Đầu Xe Phụ Trách</th>
                <th class="py-2.5">Tuyến Hay Chạy Nhất</th>
                <th onclick="toggleReport4Sort('trips_count')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Số Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('direct_expense')" class="cursor-pointer hover:bg-amber-100/50 text-right py-2.5 bg-amber-50/50"><div class="flex items-center justify-end gap-1"><span class="text-amber-900 font-black">Tổng Chi Phí Hiện Trường</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('bot_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Vé BOT</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('lift_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Nâng Hạ / Cảng</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('driver_allowance')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Lương / Bồi Dưỡng</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('avg_cost_per_trip')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Phí BQ/Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
            </tr>
        `;
    } else if (rep4ActivePerspective === 'customer') {
        thead.innerHTML = `
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider font-heading">
                <th class="text-center w-12 font-bold py-2.5">STT</th>
                <th onclick="toggleReport4Sort('customer_name')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Khách Hàng</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th class="py-2.5">Mã KH</th>
                <th class="py-2.5">Tuyến Vận Chuyển Chính</th>
                <th onclick="toggleReport4Sort('trips_count')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Số Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('revenue')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Doanh Thu Cước</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('direct_expense')" class="cursor-pointer hover:bg-amber-100/50 text-right py-2.5 bg-amber-50/50"><div class="flex items-center justify-end gap-1"><span class="text-amber-900 font-black">Chi Phí Cty Chịu</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('reimbursable_fee')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Chi Hộ (Debit Note)</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('gross_profit')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Lợi Nhuận Gộp</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('margin_percent')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Biên LN (%)</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
            </tr>
        `;
    } else if (rep4ActivePerspective === 'reimbursable') {
        thead.innerHTML = `
            <tr class="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase tracking-wider font-heading">
                <th class="text-center w-12 font-bold py-2.5">STT</th>
                <th onclick="toggleReport4Sort('trip_code')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Mã Chuyến</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('customer_name')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Khách Hàng</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('expense_name')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Khoản Mục Chi Hộ</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('expense_type')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Phân Loại</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('amount')" class="cursor-pointer hover:bg-slate-100 text-right py-2.5"><div class="flex items-center justify-end gap-1"><span>Số Tiền (VNĐ)</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('invoice_number')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Số Hóa Đơn / Chứng Từ</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('date')" class="cursor-pointer hover:bg-slate-100 py-2.5"><div class="flex items-center gap-1"><span>Ngày Phát Sinh</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
                <th onclick="toggleReport4Sort('is_settled')" class="cursor-pointer hover:bg-slate-100 text-center py-2.5"><div class="flex items-center justify-center gap-1"><span>Tình Trạng Thu Hồi</span><i class="ph-bold ph-arrows-down-up text-[11px] text-slate-400"></i></div></th>
            </tr>
        `;
    }
}

function applyReport4Filters() {
    const searchVal = (document.getElementById('filter-rep4-search')?.value || '').toLowerCase().trim();

    let sourceList = [];
    if (rep4ActivePerspective === 'route') sourceList = rep4RoutesCache;
    else if (rep4ActivePerspective === 'vehicle') sourceList = rep4VehiclesCache;
    else if (rep4ActivePerspective === 'driver') sourceList = rep4DriversCache;
    else if (rep4ActivePerspective === 'customer') sourceList = rep4CustomersCache;
    else if (rep4ActivePerspective === 'reimbursable') sourceList = rep4ItemsCache;

    let list = sourceList.filter(item => {
        if (!searchVal) return true;
        if (rep4ActivePerspective === 'route') {
            return (item.route_name || '').toLowerCase().includes(searchVal);
        } else if (rep4ActivePerspective === 'vehicle') {
            return (item.plate || '').toLowerCase().includes(searchVal) || (item.top_route || '').toLowerCase().includes(searchVal);
        } else if (rep4ActivePerspective === 'driver') {
            return (item.driver_name || '').toLowerCase().includes(searchVal) || (item.driver_code || '').toLowerCase().includes(searchVal) || (item.top_route || '').toLowerCase().includes(searchVal);
        } else if (rep4ActivePerspective === 'customer') {
            return (item.customer_name || '').toLowerCase().includes(searchVal) || (item.customer_code || '').toLowerCase().includes(searchVal) || (item.top_route || '').toLowerCase().includes(searchVal);
        } else if (rep4ActivePerspective === 'reimbursable') {
            return (item.trip_code || '').toLowerCase().includes(searchVal) ||
                   (item.customer_name || '').toLowerCase().includes(searchVal) ||
                   (item.expense_name || '').toLowerCase().includes(searchVal) ||
                   (item.expense_type || '').toLowerCase().includes(searchVal) ||
                   (item.invoice_number || '').toLowerCase().includes(searchVal);
        }
        return true;
    });

    // Sắp xếp
    list.sort((a, b) => {
        let valA = a[rep4SortCol];
        let valB = b[rep4SortCol];
        if (typeof valA === 'number' || typeof valB === 'number') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }
        if (valA < valB) return rep4SortAsc ? -1 : 1;
        if (valA > valB) return rep4SortAsc ? 1 : -1;
        return 0;
    });

    rep4DataFiltered = list;
    renderReport4Rows(list);
}
window.applyReport4Filters = applyReport4Filters;

function renderReport4Rows(list) {
    const tbody = document.getElementById('rep4-tbody');
    const tfoot = document.getElementById('rep4-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium"><i class="ph-bold ph-info text-2xl mb-1 text-slate-300 block"></i> Không có dữ liệu chi phí nào phù hợp với bộ lọc</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    if (rep4ActivePerspective === 'route') {
        const totalTrips = list.reduce((s, i) => s + (Number(i.trips_count) || 0), 0);
        const totalConts = list.reduce((s, i) => s + (Number(i.containers_count) || 0), 0);
        const totalRev = list.reduce((s, i) => s + (Number(i.revenue) || 0), 0);
        const totalExp = list.reduce((s, i) => s + (Number(i.direct_expense) || 0), 0);
        const totalBot = list.reduce((s, i) => s + (Number(i.bot_fee) || 0), 0);
        const totalLift = list.reduce((s, i) => s + (Number(i.lift_fee) || 0), 0);
        const totalReimb = list.reduce((s, i) => s + (Number(i.reimbursable_fee) || 0), 0);
        const overallAvg = totalTrips > 0 ? Math.round(totalExp / totalTrips) : 0;
        const overallRatio = totalRev > 0 ? (totalExp / totalRev * 100).toFixed(1) : '0.0';

        tbody.innerHTML = list.map((item, index) => {
            const trips = item.trips || [];
            const nestedTripsTable = renderNestedTripsTableHtml(trips, 'ROUTE', item.route_name);

            return `
                <tr id="rep4-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport4Row(${index})" title="Nhấp để xem danh sách chuyến xe và chi tiết chi phí trên tuyến này">
                    <td class="text-center font-bold text-slate-500 text-[13px]">
                        <div class="flex items-center justify-center gap-1">
                            <i id="rep4-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                            <span>${index + 1}</span>
                        </div>
                    </td>
                    <td class="font-bold text-teal-900 text-[13px] group-hover:text-teal-700 transition-colors max-w-sm">
                        <div class="flex items-center gap-1.5 justify-between">
                            <div class="flex items-center gap-1.5 truncate" title="${escapeHtml(item.route_name)}">
                                <span class="truncate">${escapeHtml(item.route_name)}</span>
                                <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                    <td class="text-center text-slate-700 text-[13px] tabular-nums">${item.containers_count}</td>
                    <td class="text-right font-black text-slate-900 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.revenue) : '***'}</td>
                    <td class="text-right font-black text-amber-700 text-[13px] tabular-nums bg-amber-50/40">${canViewFinance ? formatMoneyVND(item.direct_expense) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.bot_fee) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.lift_fee) : '***'}</td>
                    <td class="text-right font-bold text-indigo-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.reimbursable_fee) : '***'}</td>
                    <td class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.avg_cost_per_trip) : '***'}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.cost_ratio}%</td>
                </tr>
                <tr id="rep4-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                    <td colspan="11" class="p-3 sm:p-4 bg-teal-50/20">
                        <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                <span class="font-bold text-slate-800">Các Chuyến Xe & Chi Phí Phát Sinh Trên Tuyến:</span>
                                <span class="font-black text-teal-800 text-sm">${escapeHtml(item.route_name)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('ROUTE', ${index})" class="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer" title="Mở bảng kê chi tiết toàn bộ vận đơn">
                                    <i class="ph-bold ph-arrows-out-simple"></i> Mở Bảng Kê Chi Tiết
                                </button>
                                <button type="button" onclick="event.stopPropagation(); toggleReport4Row(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
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
                    <td class="text-center font-black py-3">TỔNG</td>
                    <td class="py-3 px-3 uppercase text-slate-900 font-black">${list.length} Tuyến Vận Tải</td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${totalTrips}</td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${totalConts}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-amber-800 py-3 bg-amber-100/60">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalBot) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalLift) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-indigo-800 py-3">${canViewFinance ? formatMoneyVND(totalReimb) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-emerald-800 py-3">${canViewFinance ? formatMoneyVND(overallAvg) : '***'}</td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${overallRatio}%</td>
                </tr>
            `;
        }
    } else if (rep4ActivePerspective === 'vehicle') {
        const totalTrips = list.reduce((s, i) => s + (Number(i.trips_count) || 0), 0);
        const totalRev = list.reduce((s, i) => s + (Number(i.revenue) || 0), 0);
        const totalExp = list.reduce((s, i) => s + (Number(i.direct_expense) || 0), 0);
        const totalBot = list.reduce((s, i) => s + (Number(i.bot_fee) || 0), 0);
        const totalLift = list.reduce((s, i) => s + (Number(i.lift_fee) || 0), 0);
        const overallAvg = totalTrips > 0 ? Math.round(totalExp / totalTrips) : 0;
        const overallRatio = totalRev > 0 ? (totalExp / totalRev * 100).toFixed(1) : '0.0';

        tbody.innerHTML = list.map((item, index) => {
            const trips = item.trips || [];
            const nestedTripsTable = renderNestedTripsTableHtml(trips, 'VEHICLE', item.plate);

            return `
                <tr id="rep4-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport4Row(${index})" title="Nhấp để xem danh sách chuyến xe và chi phí của đầu xe này">
                    <td class="text-center font-bold text-slate-500 text-[13px]">
                        <div class="flex items-center justify-center gap-1">
                            <i id="rep4-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                            <span>${index + 1}</span>
                        </div>
                    </td>
                    <td class="font-bold text-teal-900 font-mono text-[13px] group-hover:text-teal-700 transition-colors">
                        <div class="flex items-center gap-1.5 justify-between">
                            <div class="flex items-center gap-1.5">
                                <span>${escapeHtml(item.plate)}</span>
                                <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                            </div>
                            <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('VEHICLE', ${index})" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded cursor-pointer" title="Mở bảng kê chi tiết đầu xe này">
                                <i class="ph-bold ph-arrow-square-out text-sm"></i>
                            </button>
                        </div>
                    </td>
                    <td class="text-slate-600 text-[13px]">${escapeHtml(item.vehicle_type)} <span class="text-xs text-slate-400">(${item.ownership})</span></td>
                    <td class="text-slate-700 text-[13px] max-w-xs truncate" title="${escapeHtml(item.top_route)}">${escapeHtml(item.top_route)}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                    <td class="text-right font-black text-slate-900 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.revenue) : '***'}</td>
                    <td class="text-right font-black text-amber-700 text-[13px] tabular-nums bg-amber-50/40">${canViewFinance ? formatMoneyVND(item.direct_expense) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.bot_fee) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.lift_fee) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.other_fee) : '***'}</td>
                    <td class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.avg_cost_per_trip) : '***'}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.cost_ratio}%</td>
                </tr>
                <tr id="rep4-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                    <td colspan="12" class="p-3 sm:p-4 bg-teal-50/20">
                        <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                <span class="font-bold text-slate-800">Các Chuyến Xe Của Đầu Xe:</span>
                                <span class="font-black text-teal-800 font-mono text-sm">${escapeHtml(item.plate)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('VEHICLE', ${index})" class="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer" title="Mở bảng kê chi tiết toàn bộ vận đơn">
                                    <i class="ph-bold ph-arrows-out-simple"></i> Mở Bảng Kê Chi Tiết
                                </button>
                                <button type="button" onclick="event.stopPropagation(); toggleReport4Row(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
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
                    <td class="text-center font-black py-3">TỔNG</td>
                    <td class="py-3 px-3 uppercase text-slate-900 font-black">${list.length} Đầu Xe</td>
                    <td colspan="2" class="text-center text-slate-400 font-normal"></td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${totalTrips}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-amber-800 py-3 bg-amber-100/60">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalBot) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalLift) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">-</td>
                    <td class="text-right font-black tabular-nums text-emerald-800 py-3">${canViewFinance ? formatMoneyVND(overallAvg) : '***'}</td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${overallRatio}%</td>
                </tr>
            `;
        }
    } else if (rep4ActivePerspective === 'driver') {
        const totalTrips = list.reduce((s, i) => s + (Number(i.trips_count) || 0), 0);
        const totalExp = list.reduce((s, i) => s + (Number(i.direct_expense) || 0), 0);
        const totalBot = list.reduce((s, i) => s + (Number(i.bot_fee) || 0), 0);
        const totalLift = list.reduce((s, i) => s + (Number(i.lift_fee) || 0), 0);
        const totalPay = list.reduce((s, i) => s + (Number(i.driver_allowance) || 0), 0);
        const overallAvg = totalTrips > 0 ? Math.round(totalExp / totalTrips) : 0;

        tbody.innerHTML = list.map((item, index) => {
            const trips = item.trips || [];
            const nestedTripsTable = renderNestedTripsTableHtml(trips, 'DRIVER', item.driver_name);

            return `
                <tr id="rep4-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport4Row(${index})" title="Nhấp để xem danh sách chuyến xe và các khoản chi hiện trường của tài xế này">
                    <td class="text-center font-bold text-slate-500 text-[13px]">
                        <div class="flex items-center justify-center gap-1">
                            <i id="rep4-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                            <span>${index + 1}</span>
                        </div>
                    </td>
                    <td class="font-bold text-teal-900 text-[13px] group-hover:text-teal-700 transition-colors">
                        <div class="flex items-center gap-1.5 justify-between">
                            <div class="flex items-center gap-1.5">
                                <span>${escapeHtml(item.driver_name)}</span>
                                <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                            </div>
                        </div>
                    </td>
                    <td class="text-slate-600 font-mono text-[13px]">${escapeHtml(item.driver_code)}</td>
                    <td class="text-slate-800 font-mono font-bold text-[13px]">${escapeHtml(item.assigned_vehicle)}</td>
                    <td class="text-slate-700 text-[13px] max-w-xs truncate" title="${escapeHtml(item.top_route)}">${escapeHtml(item.top_route)}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                    <td class="text-right font-black text-amber-700 text-[13px] tabular-nums bg-amber-50/40">${canViewFinance ? formatMoneyVND(item.direct_expense) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.bot_fee) : '***'}</td>
                    <td class="text-right font-bold text-slate-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.lift_fee) : '***'}</td>
                    <td class="text-right font-bold text-indigo-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.driver_allowance) : '***'}</td>
                    <td class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.avg_cost_per_trip) : '***'}</td>
                </tr>
                <tr id="rep4-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                    <td colspan="11" class="p-3 sm:p-4 bg-teal-50/20">
                        <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                <span class="font-bold text-slate-800">Các Chuyến & Chi Phí Phát Sinh Của Tài Xế:</span>
                                <span class="font-black text-teal-800 text-sm">${escapeHtml(item.driver_name)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="event.stopPropagation(); toggleReport4Row(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
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
                    <td class="text-center font-black py-3">TỔNG</td>
                    <td class="py-3 px-3 uppercase text-slate-900 font-black">${list.length} Tài Xế</td>
                    <td colspan="3" class="text-center text-slate-400 font-normal"></td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${totalTrips}</td>
                    <td class="text-right font-black tabular-nums text-amber-800 py-3 bg-amber-100/60">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalBot) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalLift) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-indigo-800 py-3">${canViewFinance ? formatMoneyVND(totalPay) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-emerald-800 py-3">${canViewFinance ? formatMoneyVND(overallAvg) : '***'}</td>
                </tr>
            `;
        }
    } else if (rep4ActivePerspective === 'customer') {
        const totalTrips = list.reduce((s, i) => s + (Number(i.trips_count) || 0), 0);
        const totalRev = list.reduce((s, i) => s + (Number(i.revenue) || 0), 0);
        const totalExp = list.reduce((s, i) => s + (Number(i.direct_expense) || 0), 0);
        const totalReimb = list.reduce((s, i) => s + (Number(i.reimbursable_fee) || 0), 0);
        const totalProfit = totalRev - totalExp;
        const overallMargin = totalRev > 0 ? (totalProfit / totalRev * 100).toFixed(1) : '0.0';

        tbody.innerHTML = list.map((item, index) => {
            const trips = item.trips || [];
            const nestedTripsTable = renderNestedTripsTableHtml(trips, 'CUSTOMER', item.customer_name);

            return `
                <tr id="rep4-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport4Row(${index})" title="Nhấp để xem danh sách chuyến xe và chi phí của khách hàng này">
                    <td class="text-center font-bold text-slate-500 text-[13px]">
                        <div class="flex items-center justify-center gap-1">
                            <i id="rep4-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                            <span>${index + 1}</span>
                        </div>
                    </td>
                    <td class="font-bold text-teal-900 text-[13px] group-hover:text-teal-700 transition-colors">
                        <div class="flex items-center gap-1.5 justify-between">
                            <div class="flex items-center gap-1.5">
                                <span>${escapeHtml(item.customer_name)}</span>
                                <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                            </div>
                            <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('CUSTOMER', ${index})" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded cursor-pointer" title="Mở bảng kê chi tiết khách hàng này">
                                <i class="ph-bold ph-arrow-square-out text-sm"></i>
                            </button>
                        </div>
                    </td>
                    <td class="text-slate-600 font-mono text-[13px]">${escapeHtml(item.customer_code)}</td>
                    <td class="text-slate-700 text-[13px] max-w-xs truncate" title="${escapeHtml(item.top_route)}">${escapeHtml(item.top_route)}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                    <td class="text-right font-black text-slate-900 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.revenue) : '***'}</td>
                    <td class="text-right font-black text-amber-700 text-[13px] tabular-nums bg-amber-50/40">${canViewFinance ? formatMoneyVND(item.direct_expense) : '***'}</td>
                    <td class="text-right font-bold text-indigo-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.reimbursable_fee) : '***'}</td>
                    <td class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${canViewFinance ? formatMoneyVND(item.gross_profit) : '***'}</td>
                    <td class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.margin_percent}%</td>
                </tr>
                <tr id="rep4-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                    <td colspan="10" class="p-3 sm:p-4 bg-teal-50/20">
                        <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                                <span class="font-bold text-slate-800">Các Chuyến Xe Của Khách Hàng:</span>
                                <span class="font-black text-teal-800 text-sm">${escapeHtml(item.customer_name)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('CUSTOMER', ${index})" class="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer" title="Mở bảng kê chi tiết toàn bộ vận đơn">
                                    <i class="ph-bold ph-arrows-out-simple"></i> Mở Bảng Kê Chi Tiết
                                </button>
                                <button type="button" onclick="event.stopPropagation(); toggleReport4Row(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
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
                    <td class="text-center font-black py-3">TỔNG</td>
                    <td class="py-3 px-3 uppercase text-slate-900 font-black">${list.length} Khách Hàng</td>
                    <td colspan="2" class="text-center text-slate-400 font-normal"></td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${totalTrips}</td>
                    <td class="text-right font-black tabular-nums text-slate-900 py-3">${canViewFinance ? formatMoneyVND(totalRev) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-amber-800 py-3 bg-amber-100/60">${canViewFinance ? formatMoneyVND(totalExp) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-indigo-800 py-3">${canViewFinance ? formatMoneyVND(totalReimb) : '***'}</td>
                    <td class="text-right font-black tabular-nums text-emerald-800 py-3">${canViewFinance ? formatMoneyVND(totalProfit) : '***'}</td>
                    <td class="text-center font-black tabular-nums text-slate-900 py-3">${overallMargin}%</td>
                </tr>
            `;
        }
    } else if (rep4ActivePerspective === 'reimbursable') {
        const totalAmount = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const settledAmount = list.filter(i => i.is_settled).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const pendingAmount = totalAmount - settledAmount;

        tbody.innerHTML = list.map((item, index) => {
            const settleBadge = item.is_settled
                ? `<span class="font-bold text-emerald-700 text-xs">Đã thu hồi</span>`
                : `<span class="font-bold text-rose-600 text-xs">Chờ khách trả</span>`;

            return `
                <tr class="hover:bg-teal-50/40 transition-colors">
                    <td class="text-center font-bold text-slate-500 text-[13px] py-2.5">${index + 1}</td>
                    <td class="py-2.5"><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-800 hover:underline font-black text-[13px]">${escapeHtml(item.trip_code)}</a></td>
                    <td class="text-[13px] font-bold text-slate-900 py-2.5">${escapeHtml(item.customer_name)}</td>
                    <td class="text-[13px] font-bold text-slate-800 py-2.5">${escapeHtml(item.expense_name)}</td>
                    <td class="text-[13px] text-slate-600 py-2.5">${escapeHtml(item.expense_type)}</td>
                    <td class="text-right font-black text-slate-900 text-[13px] tabular-nums py-2.5">${canViewFinance ? formatMoneyVND(item.amount) : '***'}</td>
                    <td class="text-[13px] font-mono text-slate-600 py-2.5">${escapeHtml(item.invoice_number)}</td>
                    <td class="text-[13px] text-slate-600 tabular-nums py-2.5 font-mono">${escapeHtml(item.date)}</td>
                    <td class="text-center py-2.5">${settleBadge}</td>
                </tr>
            `;
        }).join('');

        if (tfoot) {
            tfoot.innerHTML = `
                <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-[13.5px]">
                    <td colspan="5" class="py-3 px-3 uppercase">TỔNG CỘNG: ${list.length} Khoản Chi Hộ</td>
                    <td class="text-right font-mono font-black text-slate-900 tabular-nums py-3">${canViewFinance ? formatMoneyVND(totalAmount) : '***'}</td>
                    <td colspan="3" class="text-right font-mono font-bold text-slate-600 tabular-nums py-3">
                        <span class="text-emerald-700">Đã thu: ${formatMoneyVND(settledAmount)}</span> · 
                        <span class="text-rose-700 font-black">Chờ thu: ${formatMoneyVND(pendingAmount)}</span>
                    </td>
                </tr>
            `;
        }
    }
}

function toggleReport4Row(index) {
    const detailRow = document.getElementById(`rep4-detail-${index}`);
    const caretIcon = document.getElementById(`rep4-caret-${index}`);
    const parentRow = document.getElementById(`rep4-row-${index}`);
    if (!detailRow) return;

    const isHidden = detailRow.classList.contains('hidden');
    if (isHidden) {
        detailRow.classList.remove('hidden');
        if (caretIcon) caretIcon.classList.add('rotate-90');
        if (parentRow) parentRow.classList.add('bg-teal-50/70', 'font-semibold');
    } else {
        detailRow.classList.add('hidden');
        if (caretIcon) caretIcon.classList.remove('rotate-90');
        if (parentRow) parentRow.classList.remove('bg-teal-50/70', 'font-semibold');
    }
}
window.toggleReport4Row = toggleReport4Row;

function toggleReport4Sort(col) {
    if (rep4SortCol === col) {
        rep4SortAsc = !rep4SortAsc;
    } else {
        rep4SortCol = col;
        rep4SortAsc = false;
    }
    applyReport4Filters();
}
window.toggleReport4Sort = toggleReport4Sort;

function exportReport4ToExcel() {
    let list = rep4DataFiltered || [];
    if (list.length === 0) {
        if (typeof showNotification === 'function') showNotification('Không có dữ liệu để xuất', 'warning');
        return;
    }

    let csv = '\uFEFF';
    let filename = `Bao_Cao_Chi_Phi_Tuyen_${rep4ActivePerspective}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (rep4ActivePerspective === 'route') {
        csv += 'STT,Tuyến Đường Vận Chuyển,Số Chuyến,Số Cont,Doanh Thu Tuyến (VNĐ),Tổng Chi Phí Tuyến (VNĐ),Vé BOT (VNĐ),Nâng Hạ / Bãi (VNĐ),Chi Hộ Khách (VNĐ),Chi Phí BQ/Chuyến (VNĐ),Tỷ Lệ CP/DT (%)\n';
        list.forEach((item, i) => {
            csv += `${i + 1},"${(item.route_name || '').replace(/"/g, '""')}",${item.trips_count || 0},${item.containers_count || 0},${item.revenue || 0},${item.direct_expense || 0},${item.bot_fee || 0},${item.lift_fee || 0},${item.reimbursable_fee || 0},${item.avg_cost_per_trip || 0},${item.cost_ratio || 0}\n`;
        });
    } else if (rep4ActivePerspective === 'vehicle') {
        csv += 'STT,Biển Số Xe,Loại Xe,Sở Hữu,Tuyến Chủ Lực,Số Chuyến,Doanh Thu (VNĐ),Tổng Chi Phí Phát Sinh (VNĐ),Vé BOT (VNĐ),Nâng Hạ (VNĐ),Chi Phí Khác (VNĐ),Chi Phí BQ/Chuyến (VNĐ),Tỷ Lệ CP/DT (%)\n';
        list.forEach((item, i) => {
            csv += `${i + 1},"${item.plate || ''}","${item.vehicle_type || ''}","${item.ownership || ''}","${(item.top_route || '').replace(/"/g, '""')}",${item.trips_count || 0},${item.revenue || 0},${item.direct_expense || 0},${item.bot_fee || 0},${item.lift_fee || 0},${item.other_fee || 0},${item.avg_cost_per_trip || 0},${item.cost_ratio || 0}\n`;
        });
    } else if (rep4ActivePerspective === 'driver') {
        csv += 'STT,Họ Tên Tài Xế,Mã TX,Đầu Xe Phụ Trách,Tuyến Hay Chạy Nhất,Số Chuyến,Tổng Chi Phí Hiện Trường (VNĐ),Vé BOT (VNĐ),Nâng Hạ (VNĐ),Lương/Bồi Dưỡng (VNĐ),Chi Phí BQ/Chuyến (VNĐ)\n';
        list.forEach((item, i) => {
            csv += `${i + 1},"${(item.driver_name || '').replace(/"/g, '""')}","${item.driver_code || ''}","${item.assigned_vehicle || ''}","${(item.top_route || '').replace(/"/g, '""')}",${item.trips_count || 0},${item.direct_expense || 0},${item.bot_fee || 0},${item.lift_fee || 0},${item.driver_allowance || 0},${item.avg_cost_per_trip || 0}\n`;
        });
    } else if (rep4ActivePerspective === 'customer') {
        csv += 'STT,Tên Khách Hàng,Mã KH,Tuyến Vận Chuyển Chính,Số Chuyến,Doanh Thu Cước (VNĐ),Chi Phí Tuyến Cty Chịu (VNĐ),Chi Hộ Debit Note (VNĐ),Lợi Nhuận Gộp (VNĐ),Biên LN (%)\n';
        list.forEach((item, i) => {
            csv += `${i + 1},"${(item.customer_name || '').replace(/"/g, '""')}","${item.customer_code || ''}","${(item.top_route || '').replace(/"/g, '""')}",${item.trips_count || 0},${item.revenue || 0},${item.direct_expense || 0},${item.reimbursable_fee || 0},${item.gross_profit || 0},${item.margin_percent || 0}\n`;
        });
    } else if (rep4ActivePerspective === 'reimbursable') {
        csv += 'STT,Mã Chuyến,Khách Hàng,Khoản Mục Chi Hộ,Phân Loại,Số Tiền (VNĐ),Số Hóa Đơn,Ngày Phát Sinh,Tình Trạng Thu Hồi\n';
        list.forEach((item, i) => {
            csv += `${i + 1},"${item.trip_code || ''}","${(item.customer_name || '').replace(/"/g, '""')}","${(item.expense_name || '').replace(/"/g, '""')}","${item.expense_type || ''}",${item.amount || 0},"${item.invoice_number || ''}","${item.date || ''}","${item.is_settled ? 'Đã thu hồi' : 'Chờ khách trả'}"\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
window.exportReport4ToExcel = exportReport4ToExcel;

// -------------------------------------------------------------
// RENDER BÁO CÁO 5: BÀN GIAO CẮT KÉO & LƯU XE SAU 0H
// -------------------------------------------------------------
function renderReport5(data) {
    const r5 = data.report5_drop_hook_and_layover || {};

    const elCount = document.getElementById('rep5-stat-overnight-count');
    if (elCount) elCount.innerText = `${r5.overnight_trips_count || 0} Chuyến`;

    const elFees = document.getElementById('rep5-stat-detention-fees');
    if (elFees) elFees.innerText = formatMoneyVND(r5.total_detention_fees || 0);

    const elAllow = document.getElementById('rep5-stat-allowances');
    if (elAllow) elAllow.innerText = formatMoneyVND(r5.total_overnight_allowances || 0);

    rep5DataCache = r5.records || [];
    applyReport5Filters();
}

function applyReport5Filters() {
    const searchVal = (document.getElementById('filter-rep5-search')?.value || '').toLowerCase().trim();
    let list = rep5DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.driver_leg1 || '').toLowerCase().includes(searchVal) ||
               (item.driver_leg2 || '').toLowerCase().includes(searchVal) ||
               (item.reason || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep5SortCol];
        let valB = b[rep5SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep5SortAsc ? -1 : 1;
        if (valA > valB) return rep5SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep5-tbody');
    const tfoot = document.getElementById('rep5-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="p-8 text-center text-slate-400 font-medium">Không có chuyến cắt kéo hoặc neo xe qua đêm nào trong kỳ</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalWaitHours = list.reduce((sum, item) => sum + (Number(item.wait_hours) || 0), 0);
    const totalDetFee = list.reduce((sum, item) => sum + (Number(item.detention_fee) || 0), 0);
    const totalAllowance = list.reduce((sum, item) => sum + (Number(item.driver_allowance) || 0), 0);

    tbody.innerHTML = list.map((item, index) => {
        const typeBadge = item.is_split_trip
            ? `<span class="text-xs font-bold text-indigo-700 uppercase">Cắt Kéo Đổi Xe</span>`
            : `<span class="text-xs font-bold text-amber-700 uppercase">Lưu Xe Sau 0H</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.container_number)}</td>
                <td>${typeBadge}</td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_leg1)} <span class="font-mono text-slate-400">(${escapeHtml(item.vehicle_leg1)})</span></td>
                <td class="text-xs text-slate-700">${escapeHtml(item.driver_leg2)} <span class="font-mono text-slate-400">(${escapeHtml(item.vehicle_leg2)})</span></td>
                <td class="text-xs font-mono text-slate-700">${escapeHtml(item.gate_out_time)}</td>
                <td class="text-xs font-mono font-bold text-amber-700">${escapeHtml(item.appointment_dropoff)}</td>
                <td class="text-xs font-mono text-slate-700">${escapeHtml(item.actual_dropoff)}</td>
                <td class="text-center font-black text-slate-900 text-xs tabular-nums">${item.wait_hours}h</td>
                <td class="text-right font-black text-teal-800 text-xs tabular-nums">${formatMoneyVND(item.detention_fee)}</td>
                <td class="text-right font-black text-indigo-700 text-xs tabular-nums">${formatMoneyVND(item.driver_allowance)}</td>
                <td class="text-xs text-slate-600 max-w-xs truncate" title="${escapeHtml(item.reason)}">${escapeHtml(item.reason)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="10" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Chuyến Bàn Giao Cắt Kéo / Neo Xe</td>
                <td class="text-center font-mono font-black tabular-nums">${totalWaitHours}h</td>
                <td class="text-right font-mono font-black text-teal-800 tabular-nums">${formatMoneyVND(totalDetFee)}</td>
                <td class="text-right font-mono font-black text-indigo-700 tabular-nums">${formatMoneyVND(totalAllowance)}</td>
                <td></td>
            </tr>
        `;
    }
}

function toggleReport5Sort(col) {
    if (rep5SortCol === col) {
        rep5SortAsc = !rep5SortAsc;
    } else {
        rep5SortCol = col;
        rep5SortAsc = false;
    }
    applyReport5Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 6: NGOẠI LỆ & SỰ CỐ HIỆN TRƯỜNG (OS&D)
// -------------------------------------------------------------
function renderReport6(data) {
    const r6 = data.report6_osd_exceptions || {};

    const elDamaged = document.getElementById('rep6-stat-damaged');
    if (elDamaged) elDamaged.innerText = `${r6.damaged_cont_count || 0} Trường hợp`;

    const elSeal = document.getElementById('rep6-stat-seal');
    if (elSeal) elSeal.innerText = `${r6.broken_seal_count || 0} Vụ việc`;

    rep6DataCache = r6.incidents || [];
    applyReport6Filters();
}

function applyReport6Filters() {
    const searchVal = (document.getElementById('filter-rep6-search')?.value || '').toLowerCase().trim();
    let list = rep6DataCache.filter(item => {
        if (!searchVal) return true;
        return (item.trip_code || '').toLowerCase().includes(searchVal) ||
               (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.container_number || '').toLowerCase().includes(searchVal) ||
               (item.seal_number || '').toLowerCase().includes(searchVal) ||
               (item.incident_type || '').toLowerCase().includes(searchVal) ||
               (item.description || '').toLowerCase().includes(searchVal);
    });

    list.sort((a, b) => {
        let valA = a[rep6SortCol];
        let valB = b[rep6SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep6SortAsc ? -1 : 1;
        if (valA > valB) return rep6SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep6-tbody');
    const tfoot = document.getElementById('rep6-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-slate-400 font-medium">Không có sự cố hoặc ngoại lệ OS&D nào được ghi nhận</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const totalDamage = list.reduce((sum, item) => sum + (Number(item.estimated_damage) || 0), 0);

    tbody.innerHTML = list.map((item, index) => {
        const podLink = item.has_pod_photo
            ? `<span class="inline-flex items-center gap-1 text-teal-700 font-bold text-xs"><i class="ph-bold ph-image"></i> Đã chụp ảnh</span>`
            : `<span class="text-slate-400 text-xs">Chưa có</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>
                <td><a href="javascript:void(0)" onclick="viewTripDetail('${item.trip_code}')" class="font-mono text-teal-700 hover:underline font-bold text-xs">${escapeHtml(item.trip_code)}</a></td>
                <td class="text-xs text-slate-600 tabular-nums">${escapeHtml(item.date)}</td>
                <td class="text-xs font-semibold text-slate-800">${escapeHtml(item.customer_name)}</td>
                <td class="text-xs font-mono font-bold text-slate-900">${escapeHtml(item.container_number)}</td>
                <td class="text-xs font-mono text-slate-600">${escapeHtml(item.seal_number || '-')}</td>
                <td class="text-xs font-bold text-rose-700">${escapeHtml(item.incident_type)}</td>
                <td class="text-xs text-slate-600 max-w-sm truncate" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</td>
                <td class="text-right font-black text-rose-600 text-xs tabular-nums">${formatMoneyVND(item.estimated_damage)}</td>
                <td class="text-center">${podLink}</td>
                <td class="text-xs font-medium text-amber-700">${escapeHtml(item.settlement_status)}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td colspan="8" class="py-2.5 px-3 uppercase">TỔNG CỘNG: ${list.length} Vụ Việc Sự Cố & Ngoại Lệ OS&D</td>
                <td class="text-right font-mono font-black text-rose-700 tabular-nums">${formatMoneyVND(totalDamage)}</td>
                <td colspan="2"></td>
            </tr>
        `;
    }
}

function toggleReport6Sort(col) {
    if (rep6SortCol === col) {
        rep6SortAsc = !rep6SortAsc;
    } else {
        rep6SortCol = col;
        rep6SortAsc = false;
    }
    applyReport6Filters();
}

// -------------------------------------------------------------
// RENDER BÁO CÁO 7: PHÂN TÍCH DOANH THU KHÁCH HÀNG & SẢN LƯỢNG TEU
// -------------------------------------------------------------
function renderReport7(data) {
    const r7 = data.report7_customer_analytics || {};
    rep7DataCache = r7.customers || [];
    applyReport7Filters();
}

function applyReport7Filters() {
    const searchVal = (document.getElementById('filter-rep7-search')?.value || '').toLowerCase().trim();
    const settlementVal = document.getElementById('filter-rep7-settlement')?.value || '';

    let list = rep7DataCache.filter(item => {
        if (settlementVal === 'SETTLED' && (item.settled_trips_count || 0) === 0) return false;
        if (settlementVal === 'PENDING' && (item.pending_settlement_trips_count || 0) === 0) return false;
        if (!searchVal) return true;
        return (item.customer_name || '').toLowerCase().includes(searchVal) ||
               (item.customer_code || '').toLowerCase().includes(searchVal) ||
               (item.top_route || '').toLowerCase().includes(searchVal);
    });

    rep7DataFiltered = list;
    list.sort((a, b) => {
        let valA = a[rep7SortCol];
        let valB = b[rep7SortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return rep7SortAsc ? -1 : 1;
        if (valA > valB) return rep7SortAsc ? 1 : -1;
        return 0;
    });

    const tbody = document.getElementById('rep7-tbody');
    const tfoot = document.getElementById('rep7-tfoot');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" class="p-8 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu khách hàng phù hợp</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        
        const elRev = document.getElementById('rep7-stat-rev');
        if (elRev) elRev.innerText = '0 đ';
        const elRevSub = document.getElementById('rep7-stat-rev-sub');
        if (elRevSub) elRevSub.innerText = 'Tổng 0 Khách hàng phát sinh đơn';
        const elTrips = document.getElementById('rep7-stat-trips');
        if (elTrips) elTrips.innerText = '0 Chuyến';
        const elConts = document.getElementById('rep7-stat-conts');
        if (elConts) elConts.innerText = '0 Cont';
        const elTeuSub = document.getElementById('rep7-stat-teu-sub');
        if (elTeuSub) elTeuSub.innerText = "Quy đổi: 0 TEU (20': 0 · 40': 0)";
        const elAvgTrip = document.getElementById('rep7-stat-avg-trip');
        if (elAvgTrip) elAvgTrip.innerText = '0 đ / Chuyến';
        const elAvgCont = document.getElementById('rep7-stat-avg-cont');
        if (elAvgCont) elAvgCont.innerText = 'BQ: 0 đ / Cont';
        return;
    }

    const totalTrips = list.reduce((sum, item) => sum + (Number(item.trips_count) || 0), 0);
    const totalTeu = list.reduce((sum, item) => sum + (Number(item.total_teu) || 0), 0);
    const total20 = list.reduce((sum, item) => sum + (Number(item.teu_20_count) || 0), 0);
    const total40 = list.reduce((sum, item) => sum + (Number(item.teu_40_count) || 0), 0);
    const total45 = list.reduce((sum, item) => sum + (Number(item.teu_45_count) || 0), 0);
    const totalRev = list.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const totalSettledRev = list.reduce((sum, item) => sum + (Number(item.settled_revenue) || 0), 0);
    const totalPendingRev = list.reduce((sum, item) => sum + (Number(item.pending_revenue !== undefined ? item.pending_revenue : (item.revenue - (item.settled_revenue || 0))) || 0), 0);
    const avgMargin = list.length > 0 ? (list.reduce((sum, item) => sum + (Number(item.margin_percent) || 0), 0) / list.length).toFixed(1) : '0.0';

    const totalConts = list.reduce((sum, item) => sum + (Number(item.containers_count || item.trips_count) || 0), 0);
    const overallAvgTrip = totalTrips > 0 ? Math.round(totalRev / totalTrips) : 0;
    const overallAvgCont = totalConts > 0 ? Math.round(totalRev / totalConts) : 0;
    const teuDisplay = (totalTeu % 1 === 0) ? totalTeu.toFixed(0) : totalTeu.toFixed(1);

    // Cập nhật 4 Thẻ Metric Cards chuẩn Phương Án 1
    const elRev = document.getElementById('rep7-stat-rev');
    if (elRev) elRev.innerText = formatMoneyVND(totalRev);
    const elRevSub = document.getElementById('rep7-stat-rev-sub');
    if (elRevSub) elRevSub.innerText = `Tổng ${list.length} Khách hàng phát sinh đơn`;

    const elTrips = document.getElementById('rep7-stat-trips');
    if (elTrips) elTrips.innerText = `${totalTrips} Chuyến`;

    const elConts = document.getElementById('rep7-stat-conts');
    if (elConts) elConts.innerText = `${totalConts} Cont`;

    const elTeuSub = document.getElementById('rep7-stat-teu-sub');
    if (elTeuSub) {
        let teuDetails = `20': ${total20} · 40': ${total40}`;
        if (total45 > 0) teuDetails += ` · 45': ${total45}`;
        elTeuSub.innerText = `Quy đổi: ${teuDisplay} TEU (${teuDetails})`;
    }

    const elAvgTrip = document.getElementById('rep7-stat-avg-trip');
    if (elAvgTrip) elAvgTrip.innerText = `${formatMoneyVND(overallAvgTrip)} / Chuyến`;
    const elAvgCont = document.getElementById('rep7-stat-avg-cont');
    if (elAvgCont) elAvgCont.innerText = `BQ: ${formatMoneyVND(overallAvgCont)} / Cont`;

tbody.innerHTML = list.map((item, index) => {
        const revDisplay = formatMoneyVND(item.revenue);
        const shareVal = item.revenue_share !== undefined ? item.revenue_share : (totalRev > 0 ? (item.revenue / totalRev * 100) : 0);
        const shareDisplay = Math.round(Number(shareVal) || 0) + '%';
        const contsCount = item.containers_count || item.trips_count;
        const avgPerTrip = item.avg_revenue_per_trip || (item.trips_count > 0 ? Math.round(item.revenue / item.trips_count) : 0);
        const avgPerCont = item.avg_revenue_per_container || (contsCount > 0 ? Math.round(item.revenue / contsCount) : 0);
        const trips = item.trips || [];
        const displayTrips = settlementVal === 'SETTLED' 
            ? trips.filter(t => Boolean(t.is_settled || t.settlement_status === 'Đã đối soát'))
            : (settlementVal === 'PENDING' 
                ? trips.filter(t => !Boolean(t.is_settled || t.settlement_status === 'Đã đối soát'))
                : trips);
        const nestedTripsTable = renderNestedTripsTableHtml(displayTrips, 'CUSTOMER', item.customer_name);

        return `
            <tr id="rep7-row-${index}" class="hover:bg-teal-50/50 transition-colors cursor-pointer group" onclick="toggleReport7CustomerRow(${index})" title="Nhấp để xem danh sách chuyến xe của ${escapeHtml(item.customer_name)} ngay dưới bảng">
                <td data-col-key="stt" class="text-center font-bold text-slate-500 text-[13px]">
                    <div class="flex items-center justify-center gap-1">
                        <i id="rep7-caret-${index}" class="ph-bold ph-caret-right text-teal-600 text-xs transition-transform duration-200"></i>
                        <span>${index + 1}</span>
                    </div>
                </td>
                <td data-col-key="customer_name" class="font-bold text-teal-900 text-[13px] group-hover:text-teal-700 transition-colors">
                    <div class="flex items-center gap-1.5 justify-between">
                        <div class="flex items-center gap-1.5">
                            <span>${escapeHtml(item.customer_name)}</span>
                            <span class="text-xs text-slate-400 font-normal">(${trips.length} chuyến)</span>
                        </div>
                        <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('CUSTOMER', ${index})" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-100 rounded cursor-pointer" title="Mở bảng kê chi tiết riêng của khách hàng này">
                            <i class="ph-bold ph-arrow-square-out text-sm"></i>
                        </button>
                    </div>
                </td>
                <td data-col-key="customer_code" class="text-slate-600 text-[13px]">${escapeHtml(item.customer_code)}</td>
                <td data-col-key="trips_count" class="text-center font-bold text-slate-800 text-[13px] tabular-nums">${item.trips_count}</td>
                <td data-col-key="total_teu" class="text-center font-black text-teal-800 text-[13px] tabular-nums bg-teal-50/50">${item.total_teu}</td>
                <td data-col-key="teu_20_count" class="text-center text-slate-600 text-[13px] tabular-nums">${item.teu_20_count}</td>
                <td data-col-key="teu_40_count" class="text-center text-slate-600 text-[13px] tabular-nums">${item.teu_40_count}</td>
                <td data-col-key="teu_45_count" class="text-center text-slate-600 text-[13px] tabular-nums">${item.teu_45_count}</td>
                <td data-col-key="top_route" class="text-[13px] text-slate-600 max-w-xs truncate" title="${escapeHtml(item.top_route)}">${escapeHtml(item.top_route)}</td>
                <td data-col-key="settlement_status" class="text-center font-bold text-slate-800 text-[13px] tabular-nums">
                    ${Number(item.settled_trips_count) || 0}/${Number(item.trips_count) || 0}
                </td>
                <td data-col-key="revenue" class="text-right font-black text-indigo-700 text-[13px] tabular-nums">${revDisplay}</td>
                <td data-col-key="settled_revenue" class="text-right font-bold text-slate-800 text-[13px] tabular-nums">${formatMoneyVND(item.settled_revenue || 0)}</td>
                <td data-col-key="pending_revenue" class="text-right font-bold text-slate-800 text-[13px] tabular-nums">${formatMoneyVND(item.pending_revenue !== undefined ? item.pending_revenue : (item.revenue - (item.settled_revenue || 0)))}</td>
                <td data-col-key="revenue_share" class="text-center font-bold text-slate-700 text-[13px] tabular-nums">${shareDisplay}</td>
                <td data-col-key="avg_revenue_per_trip" class="text-right font-bold text-emerald-700 text-[13px] tabular-nums">${formatMoneyVND(avgPerTrip)}</td>
                <td data-col-key="avg_revenue_per_container" class="text-right font-bold text-indigo-700 text-[13px] tabular-nums">${formatMoneyVND(avgPerCont)}</td>
            </tr>
            <tr id="rep7-detail-${index}" class="no-col-reorder hidden bg-slate-50/90 border-y-2 border-teal-500/30">
                <td colspan="16" class="p-3 sm:p-4 bg-teal-50/20">
                    <div class="mb-2.5 flex items-center justify-between text-xs font-heading">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                            <span class="font-bold text-slate-800">Danh Sách Chuyến Xe Vận Chuyển Cho Khách Hàng:</span>
                            <span class="font-black text-teal-800 text-sm">${escapeHtml(item.customer_name)}</span>
                            <span class="text-slate-500 font-mono">(${escapeHtml(item.customer_code || '-')} · Tuyến: ${escapeHtml(item.top_route || '-')})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="event.stopPropagation(); openDedicatedReportDetail('CUSTOMER', ${index})" class="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer" title="Mở bảng kê chi tiết toàn bộ các chuyến xe của khách hàng này trên toàn màn hình">
                                <i class="ph-bold ph-arrows-out-simple"></i> Mở Trang Chi Tiết
                            </button>
                            <button type="button" onclick="event.stopPropagation(); toggleReport7CustomerRow(${index})" class="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-teal-100/50 transition-colors cursor-pointer">
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
        const teuDisplay = (totalTeu % 1 === 0) ? totalTeu.toFixed(0) : totalTeu.toFixed(1);
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-[13.5px]">
                <td data-col-key="stt" class="text-center font-black text-slate-900 uppercase text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">TỔNG</td>
                <td data-col-key="customer_name" class="py-3 px-3 uppercase text-slate-900 font-black text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${list.length} Khách Hàng</td>
                <td data-col-key="customer_code" class="text-center text-slate-400 font-normal text-[13.5px]" style="font-size: 13.5px !important; font-family: 'Plus Jakarta Sans', sans-serif !important;"></td>
                <td data-col-key="trips_count" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${totalTrips}</td>
                <td data-col-key="total_teu" class="text-center font-black tabular-nums text-teal-800 bg-teal-50/80 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${teuDisplay}</td>
                <td data-col-key="teu_20_count" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${total20}</td>
                <td data-col-key="teu_40_count" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${total40}</td>
                <td data-col-key="teu_45_count" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${total45}</td>
                <td data-col-key="top_route" class="text-center text-slate-400 font-normal text-[13.5px]" style="font-size: 13.5px !important; font-family: 'Plus Jakarta Sans', sans-serif !important;"></td>
                <td data-col-key="settlement_status" class="text-center font-black tabular-nums text-slate-900 text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">
                    ${list.reduce((sum, item) => sum + (Number(item.settled_trips_count) || 0), 0)}/${totalTrips}
                </td>
                <td data-col-key="revenue" class="text-right font-black text-slate-900 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${formatMoneyVND(totalRev)}</td>
                <td data-col-key="settled_revenue" class="text-right font-black text-slate-900 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${formatMoneyVND(totalSettledRev)}</td>
                <td data-col-key="pending_revenue" class="text-right font-black text-slate-900 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${formatMoneyVND(totalPendingRev)}</td>
                <td data-col-key="revenue_share" class="text-center font-black text-slate-900 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">100%</td>
                <td data-col-key="avg_revenue_per_trip" class="text-right font-black text-emerald-800 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${formatMoneyVND(overallAvgTrip)}</td>
                <td data-col-key="avg_revenue_per_container" class="text-right font-black text-indigo-800 tabular-nums text-[13.5px]" style="font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;">${formatMoneyVND(overallAvgCont)}</td>
            </tr>
        `;
        if (window.BimTableColumnManager && window.BimTableColumnManager.instances && window.BimTableColumnManager.instances['rep7-customer-table']) {
            window.BimTableColumnManager.instances['rep7-customer-table'].apply();
        }
    }
}

function toggleReport7Sort(col) {
    if (rep7SortCol === col) {
        rep7SortAsc = !rep7SortAsc;
    } else {
        rep7SortCol = col;
        rep7SortAsc = false;
    }
    applyReport7Filters();
}
