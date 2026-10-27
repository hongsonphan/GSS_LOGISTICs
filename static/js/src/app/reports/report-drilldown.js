// -------------------------------------------------------------
// DRILL-DOWN MODAL: XEM DANH SÁCH CHUYẾN XE (ĐỘI XE & KHÁCH HÀNG)
// -------------------------------------------------------------

// -------------------------------------------------------------
// LƯỚI CON CHI TIẾT CÁC CHUYẾN XE (INLINE ACCORDION DETAIL)
// -------------------------------------------------------------
function renderNestedTripsTableHtml(trips, mode = 'VEHICLE', parentTitle = '') {
    if (!trips || trips.length === 0) {
        return `
            <div class="p-5 text-center text-slate-400 font-medium bg-white rounded-xl border border-dashed border-slate-300">
                <i class="ph-bold ph-truck text-2xl mb-1 text-slate-300 block"></i>
                Không có dữ liệu chuyến xe nào được ghi nhận trong kỳ lọc này
            </div>
        `;
    }

    let partnerHeader = 'Khách Hàng';
    if (mode === 'CUSTOMER') {
        partnerHeader = 'Biển Số & Tài Xế';
    } else if (mode === 'ROUTE' || mode === 'DRIVER') {
        partnerHeader = 'Xe & Khách Hàng';
    }

    const sumRev = trips.reduce((s, t) => s + (Number(t.revenue) || 0), 0);
    const sumExp = trips.reduce((s, t) => s + (Number(t.expense) || 0), 0);

    const rowsHtml = trips.map((t, idx) => {
        const isSettled = Boolean(t.is_settled || t.settlement_status === 'Đã đối soát');
        const settlementBadge = isSettled
            ? '<span class="font-bold text-emerald-700 text-xs" title="Chuyến xe đã được kế toán đối soát & quyết toán công nợ">Đã Đối Soát</span>'
            : '<span class="font-bold text-amber-600 text-xs" title="Chuyến xe đã giao hàng thành công, đang chờ đối soát công nợ">Chờ Đối Soát</span>';

        let partnerCol = '';
        if (mode === 'VEHICLE') {
            partnerCol = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 hover:text-teal-700 transition-colors cursor-pointer" onclick="event.stopPropagation(); openMasterTripFullview({ customer: '${escapeHtml(t.customer_name || '')}' })" title="Nhấn để mở trang chi tiết riêng của khách hàng này">${escapeHtml(t.customer_name || 'Khách lẻ')}</span>
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(t.customer_code || '-')}</div>
            `;
        } else if (mode === 'CUSTOMER') {
            partnerCol = `
                <div class="font-bold text-slate-800 font-mono">${escapeHtml(t.vehicle_plate || 'Chưa gán xe')}</div>
                <div class="text-[11px] text-slate-500">${escapeHtml(t.driver_name || '-')}</div>
            `;
        } else {
            // ROUTE or DRIVER
            partnerCol = `
                <div class="font-bold text-slate-800 font-mono">${escapeHtml(t.vehicle_plate || 'Chưa gán xe')}</div>
                <div class="text-[11px] text-teal-800 font-semibold truncate max-w-[160px]" title="${escapeHtml(t.customer_name || '')}">${escapeHtml(t.customer_name || 'Khách lẻ')}</div>
            `;
        }

        return `
            <tr class="hover:bg-teal-50/40 transition-colors">
                <td class="text-center font-bold text-slate-500 py-2 px-2.5">${idx + 1}</td>
                <td class="font-black text-teal-800 font-mono py-2 px-2.5">${escapeHtml(t.trip_code || '-')}</td>
                <td class="text-center text-slate-600 font-mono py-2 px-2.5">${escapeHtml(t.date || '-')}</td>
                <td class="py-2 px-2.5">${partnerCol}</td>
                <td class="py-2 px-2.5 font-mono text-slate-800">
                    <span class="font-bold">${escapeHtml(t.container_number || '-')}</span>
                    <span class="text-[11px] text-slate-400 ml-1">(${escapeHtml(t.container_type || '40HC')})</span>
                </td>
                <td class="py-2 px-2.5 text-slate-600 max-w-xs truncate" title="${escapeHtml(t.route || '-')}">${escapeHtml(t.route || '-')}</td>
                <td class="text-center py-2 px-2.5">
                    <div class="flex flex-col items-center gap-1">
                        <span class="font-bold text-teal-700 text-xs">Giao thành công</span>
                        ${settlementBadge}
                    </div>
                </td>
                <td class="text-right font-black text-slate-900 tabular-nums py-2 px-2.5">${canViewFinance ? formatMoneyVND(t.revenue) : '***'}</td>
                <td class="text-right font-bold text-amber-700 tabular-nums py-2 px-2.5">${canViewFinance ? formatMoneyVND(t.expense) : '***'}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="bg-white rounded-xl border border-teal-200 shadow-2xs overflow-hidden text-xs">
            <div class="overflow-x-auto max-h-80">
                <table class="w-full text-xs text-left border-collapse" data-no-col-manager="true">
                    <thead class="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider z-10 font-heading">
                        <tr>
                            <th class="py-2 px-2.5 text-center w-10">STT</th>
                            <th class="py-2 px-2.5">Mã Chuyến</th>
                            <th class="py-2 px-2.5 text-center">Ngày Chạy</th>
                            <th class="py-2 px-2.5">${partnerHeader}</th>
                            <th class="py-2 px-2.5">Số Cont & Loại Vỏ</th>
                            <th class="py-2 px-2.5">Tuyến Đường Vận Chuyển</th>
                            <th class="py-2 px-2.5 text-center">Trạng Thái & Đối Soát</th>
                            <th class="py-2 px-2.5 text-right">Doanh Thu</th>
                            <th class="py-2 px-2.5 text-right">Chi Phí Phát Sinh</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${rowsHtml}
                    </tbody>
                    <tfoot class="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900 text-xs no-col-reorder">
                        <tr class="no-col-reorder">
                            <td class="text-center font-black py-2">TỔNG</td>
                            <td colspan="5" class="py-2 px-2.5 uppercase font-bold text-slate-800">${trips.length} Chuyến Hoàn Thành Giao Hàng</td>
                            <td class="text-center">-</td>
                            <td class="text-right font-black tabular-nums py-2 px-2.5 text-slate-900">${canViewFinance ? formatMoneyVND(sumRev) : '***'}</td>
                            <td class="text-right font-black tabular-nums py-2 px-2.5 text-amber-800">${canViewFinance ? formatMoneyVND(sumExp) : '***'}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

function toggleReport1VehicleRow(index) {
    const detailRow = document.getElementById(`rep1-detail-${index}`);
    const caretIcon = document.getElementById(`rep1-caret-${index}`);
    const parentRow = document.getElementById(`rep1-row-${index}`);
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
window.toggleReport1VehicleRow = toggleReport1VehicleRow;

function toggleReport7CustomerRow(index) {
    const detailRow = document.getElementById(`rep7-detail-${index}`);
    const caretIcon = document.getElementById(`rep7-caret-${index}`);
    const parentRow = document.getElementById(`rep7-row-${index}`);
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
window.toggleReport7CustomerRow = toggleReport7CustomerRow;

function openVehicleDrilldown(index) {
    const item = (typeof rep1DataFiltered !== 'undefined' && rep1DataFiltered[index]) ? rep1DataFiltered[index] : rep1DataCache[index];
    if (!item) return;

    currentTmsDrilldownMode = 'VEHICLE';
    currentTmsDrilldownTarget = item;

    const iconEl = document.getElementById('drilldown-modal-icon');
    if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-truck text-xl"></i>';

    const titleEl = document.getElementById('drilldown-modal-title');
    if (titleEl) titleEl.innerText = `Chi Tiết Các Chuyến Xe: ${item.plate}`;

    const badgeEl = document.getElementById('drilldown-modal-badge');
    if (badgeEl) {
        badgeEl.innerText = item.ownership || 'Xe Nhà';
        badgeEl.className = item.ownership_code === 'OWNED' 
            ? 'px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-500/20 text-teal-200 border border-teal-400/30'
            : 'px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-200 border border-amber-400/30';
    }

    const subEl = document.getElementById('drilldown-modal-subtitle');
    if (subEl) subEl.innerText = `Loại xe: ${item.vehicle_type || 'Đầu kéo'} · Tài xế: ${item.driver || '-'}`;

    const thPartner = document.getElementById('drilldown-th-partner');
    if (thPartner) thPartner.innerText = 'Khách Hàng';

    const thLast = document.getElementById('drilldown-th-last');
    if (thLast) thLast.innerText = 'Chi Phí Phát Sinh';

    const lblFourth = document.getElementById('drilldown-stat-fourth-label');
    if (lblFourth) lblFourth.innerText = 'Chi Phí Phát Sinh';

    const valFourth = document.getElementById('drilldown-stat-fourth-val');
    if (valFourth) valFourth.innerText = canViewFinance ? formatMoneyVND(item.expense || 0) : '***';

    renderDrilldownData(item);
}

function openCustomerDrilldown(index) {
    const item = (typeof rep7DataFiltered !== 'undefined' && rep7DataFiltered[index]) ? rep7DataFiltered[index] : rep7DataCache[index];
    if (!item) return;

    currentTmsDrilldownMode = 'CUSTOMER';
    currentTmsDrilldownTarget = item;

    const iconEl = document.getElementById('drilldown-modal-icon');
    if (iconEl) iconEl.innerHTML = '<i class="ph-bold ph-buildings text-xl"></i>';

    const titleEl = document.getElementById('drilldown-modal-title');
    if (titleEl) titleEl.innerText = `Chi Tiết Các Chuyến Của Khách Hàng: ${item.customer_name}`;

    const badgeEl = document.getElementById('drilldown-modal-badge');
    if (badgeEl) {
        badgeEl.innerText = item.customer_code ? `Mã KH: ${item.customer_code}` : 'Doanh Nghiệp';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-mono';
    }

    const subEl = document.getElementById('drilldown-modal-subtitle');
    if (subEl) subEl.innerText = `Tuyến chủ lực: ${item.top_route || '-'} · Tỷ trọng: ${item.revenue_share || 0}%`;

    const thPartner = document.getElementById('drilldown-th-partner');
    if (thPartner) thPartner.innerText = 'Biển Số & Tài Xế';

    const thLast = document.getElementById('drilldown-th-last');
    if (thLast) thLast.innerText = 'Chi Phí Phát Sinh';

    const lblFourth = document.getElementById('drilldown-stat-fourth-label');
    if (lblFourth) lblFourth.innerText = 'Chi Phí Phát Sinh';

    const valFourth = document.getElementById('drilldown-stat-fourth-val');
    if (valFourth) valFourth.innerText = canViewFinance ? formatMoneyVND(item.expense || 0) : '***';

    renderDrilldownData(item);
}

function renderDrilldownData(item) {
    const trips = item.trips || [];

    const statTrips = document.getElementById('drilldown-stat-trips');
    if (statTrips) statTrips.innerText = `${item.trips_count || trips.length} Chuyến`;

    const statConts = document.getElementById('drilldown-stat-conts');
    if (statConts) statConts.innerText = `${item.containers_count || trips.length} Cont`;

    const statRev = document.getElementById('drilldown-stat-rev');
    if (statRev) statRev.innerText = canViewFinance ? formatMoneyVND(item.revenue || 0) : '***';

    const searchInput = document.getElementById('drilldown-table-search');
    if (searchInput) searchInput.value = '';

    filterDrilldownTable();

    const modal = document.getElementById('modal-report-drilldown-trips');
    if (modal) modal.classList.remove('hidden');
}

function closeReportDrilldownModal() {
    const modal = document.getElementById('modal-report-drilldown-trips');
    if (modal) modal.classList.add('hidden');
}
