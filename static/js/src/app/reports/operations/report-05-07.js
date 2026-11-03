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
                    ${Number(item.saved_trips_count) > 0 ? `<div class="text-[10px] font-bold text-amber-700" title="Đã lưu phiếu quyết toán, chờ duyệt">+${item.saved_trips_count} đã lưu</div>` : ''}
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
