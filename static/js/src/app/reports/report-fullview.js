// =========================================================================
// TRANG CHI TIẾT RIÊNG TOÀN MÀN HÌNH (DEDICATED FULL-VIEW TMS REPORTS)
// =========================================================================
// =========================================================================
// BẢNG KÊ CHI TIẾT VẬN ĐƠN TOÀN DIỆN (MASTER TRIP LEDGER & FILTERING)
// =========================================================================
let fullviewMasterTrips = [];
let fullviewSortCol = 'date';
let fullviewSortAsc = false;

function getAllReportTrips() {
    const tripMap = new Map();
    const addTrips = (trips) => {
        (trips || []).forEach(t => {
            if (t && t.id && !tripMap.has(t.id)) {
                tripMap.set(t.id, t);
            }
        });
    };

    if (typeof rep1DataCache !== 'undefined' && rep1DataCache) {
        rep1DataCache.forEach(v => addTrips(v.trips));
    }
    if (typeof rep7DataCache !== 'undefined' && rep7DataCache) {
        rep7DataCache.forEach(c => addTrips(c.trips));
    }
    if (typeof rep4RoutesCache !== 'undefined' && rep4RoutesCache) {
        rep4RoutesCache.forEach(r => addTrips(r.trips));
    }
    if (typeof rawReportsData !== 'undefined' && rawReportsData) {
        (rawReportsData.report1_fleet_pnl?.fleet_pnl || []).forEach(v => addTrips(v.trips));
        (rawReportsData.report7_customer_analytics?.customers || []).forEach(c => addTrips(c.trips));
        (rawReportsData.report4_expenses_reimbursement?.routes || []).forEach(r => addTrips(r.trips));
        addTrips(rawReportsData.report3_on_time_performance?.trips);
    }
    return Array.from(tripMap.values());
}
window.getAllReportTrips = getAllReportTrips;

function populateFullviewDropdowns(trips, selectedCustomer = '', selectedVehicle = '') {
    const custSelect = document.getElementById('fullview-filter-customer');
    const vehSelect = document.getElementById('fullview-filter-vehicle');
    const statusSelect = document.getElementById('fullview-filter-status');

    if (custSelect) {
        const custSet = new Set();
        trips.forEach(t => {
            if (t.customer_name && t.customer_name !== 'Khách lẻ') {
                custSet.add(t.customer_name);
            }
        });
        const custList = Array.from(custSet).sort((a, b) => a.localeCompare(b, 'vi'));
        let custOpts = `<option value="">-- Tất Cả Khách Hàng (${custList.length} Khách) --</option>`;
        custList.forEach(c => {
            const isSel = (c === selectedCustomer) ? 'selected' : '';
            custOpts += `<option value="${escapeHtml(c)}" ${isSel}>${escapeHtml(c)}</option>`;
        });
        custSelect.innerHTML = custOpts;
        if (selectedCustomer) custSelect.value = selectedCustomer;
    }

    if (vehSelect) {
        const vehSet = new Set();
        trips.forEach(t => {
            if (t.vehicle_plate && t.vehicle_plate !== 'Chưa gán xe' && t.vehicle_plate !== 'Chưa gán') {
                vehSet.add(t.vehicle_plate);
            }
        });
        const vehList = Array.from(vehSet).sort((a, b) => a.localeCompare(b, 'vi'));
        let vehOpts = `<option value="">-- Tất Cả Đầu Xe (${vehList.length} Xe) --</option>`;
        vehList.forEach(v => {
            const isSel = (v === selectedVehicle) ? 'selected' : '';
            vehOpts += `<option value="${escapeHtml(v)}" ${isSel}>${escapeHtml(v)}</option>`;
        });
        vehSelect.innerHTML = vehOpts;
        if (selectedVehicle) vehSelect.value = selectedVehicle;
    }

    if (statusSelect) {
        statusSelect.value = '';
    }
}

function openMasterTripFullview(options = {}) {
    fullviewMasterTrips = getAllReportTrips();

    // Nếu options có customer hoặc vehicle
    const targetCust = options.customer || '';
    const targetVeh = options.vehicle || '';

    populateFullviewDropdowns(fullviewMasterTrips, targetCust, targetVeh);

    // Reset ô tìm kiếm
    const searchInput = document.getElementById('fullview-search-input');
    if (searchInput) searchInput.value = '';

    applyFullviewFilters();

    // Ẩn bảng tổng hợp, hiện Fullview
    const summaryView = document.getElementById('report-summary-view');
    const fullView = document.getElementById('report-drilldown-fullview');
    if (summaryView) summaryView.classList.add('hidden');
    if (fullView) fullView.classList.remove('hidden');

    // Cuộn lên đầu view-bao-cao mượt mà
    document.getElementById('view-bao-cao')?.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openMasterTripFullview = openMasterTripFullview;

// Fallback giữ lại hàm cũ để không bị gãy tham chiếu
window.openDedicatedCustomerByName = function(custName) {
    openMasterTripFullview({ customer: custName });
};
window.openDedicatedReportDetail = function(mode, index) {
    if (mode === 'VEHICLE') {
        let item = (typeof rep1DataFiltered !== 'undefined' && rep1DataFiltered && rep1DataFiltered[index]) 
            ? rep1DataFiltered[index] 
            : (typeof rep1DataCache !== 'undefined' && rep1DataCache && rep1DataCache[index]);
        if (!item && typeof rep4VehiclesCache !== 'undefined' && rep4VehiclesCache && rep4VehiclesCache[index]) {
            item = rep4VehiclesCache[index];
        }
        if (!item && typeof rawReportsData !== 'undefined' && rawReportsData?.report1_fleet_pnl?.fleet_pnl) {
            item = rawReportsData.report1_fleet_pnl.fleet_pnl[index];
        }
        openMasterTripFullview({ vehicle: item?.plate || '' });
    } else if (mode === 'CUSTOMER') {
        let item = (typeof rep7DataFiltered !== 'undefined' && rep7DataFiltered && rep7DataFiltered[index]) 
            ? rep7DataFiltered[index] 
            : (typeof rep7DataCache !== 'undefined' && rep7DataCache && rep7DataCache[index]);
        if (!item && typeof rep4CustomersCache !== 'undefined' && rep4CustomersCache && rep4CustomersCache[index]) {
            item = rep4CustomersCache[index];
        }
        if (!item && typeof rawReportsData !== 'undefined' && rawReportsData?.report7_customer_analytics?.customers) {
            item = rawReportsData.report7_customer_analytics.customers[index];
        }
        openMasterTripFullview({ customer: item?.customer_name || '' });
    } else if (mode === 'ROUTE') {
        let item = (typeof rep4RoutesCache !== 'undefined' && rep4RoutesCache && rep4RoutesCache[index]) ? rep4RoutesCache[index] : null;
        openMasterTripFullview({ route: item?.route_name || '' });
    } else if (mode === 'DRIVER') {
        let item = (typeof rep4DriversCache !== 'undefined' && rep4DriversCache && rep4DriversCache[index]) ? rep4DriversCache[index] : null;
        openMasterTripFullview({ driver: item?.driver_name || '' });
    }
};

function closeDedicatedReportDetail() {
    const summaryView = document.getElementById('report-summary-view');
    const fullView = document.getElementById('report-drilldown-fullview');
    if (fullView) fullView.classList.add('hidden');
    if (summaryView) summaryView.classList.remove('hidden');
}
window.closeDedicatedReportDetail = closeDedicatedReportDetail;

function resetFullviewFilters() {
    const custSelect = document.getElementById('fullview-filter-customer');
    const vehSelect = document.getElementById('fullview-filter-vehicle');
    const statusSelect = document.getElementById('fullview-filter-status');
    const searchInput = document.getElementById('fullview-search-input');

    if (custSelect) custSelect.value = '';
    if (vehSelect) vehSelect.value = '';
    if (statusSelect) statusSelect.value = '';
    if (searchInput) searchInput.value = '';

    applyFullviewFilters();
}
window.resetFullviewFilters = resetFullviewFilters;

function toggleFullviewSort(col) {
    if (fullviewSortCol === col) {
        fullviewSortAsc = !fullviewSortAsc;
    } else {
        fullviewSortCol = col;
        fullviewSortAsc = (col === 'date') ? false : true;
    }
    applyFullviewFilters();
}
window.toggleFullviewSort = toggleFullviewSort;

function applyFullviewFilters() {
    const custVal = document.getElementById('fullview-filter-customer')?.value || '';
    const vehVal = document.getElementById('fullview-filter-vehicle')?.value || '';
    const statusVal = document.getElementById('fullview-filter-status')?.value || '';
    const searchVal = (document.getElementById('fullview-search-input')?.value || '').toLowerCase().trim();

    let filtered = (fullviewMasterTrips || []).filter(t => {
        if (custVal && t.customer_name !== custVal) return false;
        if (vehVal && t.vehicle_plate !== vehVal) return false;
        if (statusVal) {
            const st = (t.status || '').toUpperCase();
            if (statusVal === 'COMPLETED' && st !== 'COMPLETED' && st !== 'DELIVERED') return false;
            if (statusVal === 'IN_TRANSIT' && st !== 'IN_TRANSIT' && st !== 'AT_WAREHOUSE' && st !== 'UNLOADING') return false;
            if (statusVal === 'CANCELLED' && st !== 'CANCELLED') return false;
            if (statusVal === 'CONTAINER_PICKED' && st !== 'CONTAINER_PICKED' && st !== 'ACCEPTED' && st !== 'DISPATCHED') return false;
        }
        if (searchVal) {
            const txt = `${t.trip_code} ${t.container_number} ${t.customer_name} ${t.customer_code} ${t.vehicle_plate} ${t.driver_name} ${t.route} ${t.status_label || ''}`.toLowerCase();
            if (!txt.includes(searchVal)) return false;
        }
        return true;
    });

    // Sắp xếp
    filtered.sort((a, b) => {
        let valA = a[fullviewSortCol] || '';
        let valB = b[fullviewSortCol] || '';
        if (fullviewSortCol === 'revenue' || fullviewSortCol === 'expense') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        } else if (fullviewSortCol === 'date') {
            const parseDate = (d) => {
                if (!d || d === '-') return '';
                const p = d.split('/');
                return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : d;
            };
            valA = parseDate(valA);
            valB = parseDate(valB);
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }
        if (valA < valB) return fullviewSortAsc ? -1 : 1;
        if (valA > valB) return fullviewSortAsc ? 1 : -1;
        return 0;
    });

    // Cập nhật Badge tiêu đề
    const badgeEl = document.getElementById('fullview-badge');
    if (badgeEl) {
        if (custVal) {
            badgeEl.innerText = custVal;
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 font-mono';
        } else if (vehVal) {
            badgeEl.innerText = vehVal;
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800 font-mono';
        } else {
            badgeEl.innerText = `Tất Cả (${filtered.length} Chuyến)`;
            badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 font-mono';
        }
    }

    // Tính toán số liệu thống kê
    const sumRev = filtered.reduce((s, t) => s + (Number(t.revenue) || 0), 0);
    const sumExp = filtered.reduce((s, t) => s + (Number(t.expense) || 0), 0);
    const sumConts = filtered.length; // Số lượng container

    let count20 = 0, count40 = 0, count45 = 0;
    filtered.forEach(t => {
        const cType = (t.container_type || '').toUpperCase();
        if (cType.includes('20')) count20++;
        else if (cType.includes('45')) count45++;
        else count40++;
    });
    const totalTeu = count20 * 1 + count40 * 2 + count45 * 2.25;
    const teuDisplay = (totalTeu % 1 === 0) ? totalTeu.toFixed(0) : totalTeu.toFixed(1);

    // Cập nhật 4 thẻ KPI
    const statRev = document.getElementById('fullview-stat-rev');
    if (statRev) statRev.innerText = canViewFinance ? formatMoneyVND(sumRev) : '***';

    const statTrips = document.getElementById('fullview-stat-trips');
    if (statTrips) statTrips.innerText = `${filtered.length} Chuyến`;

    const statConts = document.getElementById('fullview-stat-conts');
    if (statConts) statConts.innerText = `${sumConts} Cont`;

    const statContsSub = document.getElementById('fullview-stat-conts-sub');
    if (statContsSub) statContsSub.innerText = `Quy đổi: ${teuDisplay} TEU (20': ${count20} · 40': ${count40} · 45': ${count45})`;

    const statExp = document.getElementById('fullview-stat-expense');
    if (statExp) statExp.innerText = canViewFinance ? formatMoneyVND(sumExp) : '***';

    // Cập nhật số đếm
    const countEl = document.getElementById('fullview-table-count');
    if (countEl) countEl.innerText = `Hiển thị ${filtered.length} / ${fullviewMasterTrips.length} chuyến xe`;

    // Render bảng
    const tbody = document.getElementById('fullview-trips-tbody');
    const tfoot = document.getElementById('fullview-trips-tfoot');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-12 text-center text-slate-400 font-medium"><i class="ph-bold ph-info text-3xl mb-1 text-slate-300 block"></i> Không có chuyến xe nào phù hợp với bộ lọc hiện tại</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    tbody.innerHTML = filtered.map((t, idx) => {
        let statusBadge = '<span class="font-bold text-slate-600 text-xs">Mới tạo</span>';
        const st = (t.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'DELIVERED') {
            statusBadge = '<span class="font-bold text-emerald-700 text-xs">Hoàn Thành</span>';
        } else if (st === 'IN_TRANSIT' || st === 'AT_WAREHOUSE' || st === 'UNLOADING') {
            statusBadge = '<span class="font-bold text-amber-600 text-xs">Đang Chạy</span>';
        } else if (st === 'CANCELLED') {
            statusBadge = '<span class="font-bold text-rose-600 text-xs">Đã Hủy</span>';
        } else {
            statusBadge = '<span class="font-bold text-teal-700 text-xs">Đã Giao Tài</span>';
        }

        return `
            <tr class="hover:bg-teal-50/30 transition-colors">
                <td class="text-center font-bold text-slate-500 py-3">${idx + 1}</td>
                <td class="font-black text-teal-800 font-mono py-3 text-[13px]">${escapeHtml(t.trip_code || '-')}</td>
                <td class="text-center text-slate-600 font-mono py-3 text-[13px]">${escapeHtml(t.date || '-')}</td>
                <td class="py-3">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-bold text-slate-900 hover:text-teal-700 transition-colors cursor-pointer" onclick="openMasterTripFullview({ customer: '${escapeHtml(t.customer_name || '')}' })" title="Lọc xem riêng khách hàng này">${escapeHtml(t.customer_name || 'Khách lẻ')}</span>
                    </div>
                    <div class="text-xs text-slate-400 font-mono">${escapeHtml(t.customer_code || '-')}</div>
                </td>
                <td class="py-3">
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-slate-900 font-mono hover:text-teal-700 transition-colors cursor-pointer" onclick="openMasterTripFullview({ vehicle: '${escapeHtml(t.vehicle_plate || '')}' })" title="Lọc xem riêng đầu xe này">${escapeHtml(t.vehicle_plate || 'Chưa gán')}</span>
                    </div>
                    <div class="text-xs text-slate-500">${escapeHtml(t.driver_name || '-')}</div>
                </td>
                <td class="py-3 font-mono text-slate-800">
                    <span class="font-bold text-[13px]">${escapeHtml(t.container_number || '-')}</span>
                    <span class="text-xs text-slate-400 ml-1">(${escapeHtml(t.container_type || '40HC')})</span>
                </td>
                <td class="py-3 text-slate-700 max-w-sm truncate text-[13px]" title="${escapeHtml(t.route || '-')}">${escapeHtml(t.route || '-')}</td>
                <td class="text-center py-3">${statusBadge}</td>
                <td class="text-right font-black text-slate-900 tabular-nums py-3 text-[13px]">${canViewFinance ? formatMoneyVND(t.revenue) : '***'}</td>
                <td class="text-right font-bold text-amber-700 tabular-nums py-3 text-[13px]">${canViewFinance ? formatMoneyVND(t.expense) : '***'}</td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-[13.5px]">
                <td class="text-center font-black py-3">TỔNG</td>
                <td colspan="6" class="py-3 px-3 uppercase">${filtered.length} Chuyến Vận Đơn Thực Hiện</td>
                <td class="text-center">-</td>
                <td class="text-right font-black tabular-nums py-3 text-slate-900">${canViewFinance ? formatMoneyVND(sumRev) : '***'}</td>
                <td class="text-right font-black tabular-nums py-3 text-amber-800">${canViewFinance ? formatMoneyVND(sumExp) : '***'}</td>
            </tr>
        `;
    }
}
window.applyFullviewFilters = applyFullviewFilters;

function exportFullviewToExcel() {
    const custVal = document.getElementById('fullview-filter-customer')?.value || '';
    const vehVal = document.getElementById('fullview-filter-vehicle')?.value || '';
    const trips = (fullviewMasterTrips || []).filter(t => {
        if (custVal && t.customer_name !== custVal) return false;
        if (vehVal && t.vehicle_plate !== vehVal) return false;
        return true;
    });

    if (trips.length === 0) {
        if (typeof showNotification === 'function') showNotification('Không có dữ liệu chuyến xe để xuất', 'warning');
        return;
    }
    const cleanName = custVal ? custVal.replace(/[^a-zA-Z0-9_]/g, '_') : (vehVal ? vehVal.replace(/[^a-zA-Z0-9_]/g, '_') : 'Toan_Bo_Van_Don');
    const title = `Bao_Cao_Chi_Tiet_Van_Don_${cleanName}`;

    let csv = '\uFEFF';
    csv += 'STT,Mã Chuyến,Ngày Chạy,Khách Hàng,Mã KH,Biển Số Xe,Tài Xế,Số Cont,Loại Vỏ,Tuyến Đường,Trạng Thái,Doanh Thu (VNĐ),Chi Phí Phát Sinh (VNĐ)\n';
    trips.forEach((t, i) => {
        const row = [
            i + 1,
            `"${t.trip_code || ''}"`,
            `"${t.date || ''}"`,
            `"${(t.customer_name || '').replace(/"/g, '""')}"`,
            `"${t.customer_code || ''}"`,
            `"${t.vehicle_plate || ''}"`,
            `"${(t.driver_name || '').replace(/"/g, '""')}"`,
            `"${t.container_number || ''}"`,
            `"${t.container_type || ''}"`,
            `"${(t.route || '').replace(/"/g, '""')}"`,
            `"${t.status_label || t.status || ''}"`,
            t.revenue || 0,
            t.expense || 0
        ];
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}
window.exportFullviewToExcel = exportFullviewToExcel;
