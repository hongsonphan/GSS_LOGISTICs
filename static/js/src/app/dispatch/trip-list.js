// --- 2. TẢI DỮ LIỆU PHÒNG ĐIỀU VẬN (TRIPS) ---
let rawDispatchTrips = [];
let dispatchSortColumn = null;
let dispatchSortDirection = 'asc';

function populateDispatchFilterDropdowns(trips) {
    if (!trips || !Array.isArray(trips)) return;
    
    // 1. Khách hàng
    const custSelect = document.getElementById('filter-dispatch-customer');
    if (custSelect) {
        const curCust = custSelect.value;
        const customers = [...new Set(trips.map(t => (t.customer || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        custSelect.innerHTML = '<option value="">-- Tất cả Khách hàng --</option>' + 
            customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (customers.includes(curCust)) custSelect.value = curCust;
    }

    // 2. Tài xế / Xe
    const drvSelect = document.getElementById('filter-dispatch-driver');
    if (drvSelect) {
        const curDrv = drvSelect.value;
        const drivers = [...new Set(trips.map(t => (t.driver || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        const vehicles = [...new Set(trips.map(t => (t.vehicle || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        
        let options = '<option value="">-- Tất cả Tài xế / Xe --</option>';
        if (drivers.length > 0) {
            options += '<optgroup label="Tài xế">' + drivers.map(d => `<option value="DRIVER:${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('') + '</optgroup>';
        }
        if (vehicles.length > 0) {
            options += '<optgroup label="Xe / Đầu kéo">' + vehicles.map(v => `<option value="VEHICLE:${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') + '</optgroup>';
        }
        drvSelect.innerHTML = options;
        if (curDrv) drvSelect.value = curDrv;
    }
}

function clearDispatchSearch() {
    const input = document.getElementById('filter-dispatch-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyDispatchFilters();
}

function resetDispatchFilters() {
    const cust = document.getElementById('filter-dispatch-customer');
    if (cust) cust.value = '';
    const drv = document.getElementById('filter-dispatch-driver');
    if (drv) drv.value = '';
    const status = document.getElementById('filter-dispatch-status');
    if (status) status.value = '';
    const type = document.getElementById('filter-dispatch-type');
    if (type) type.value = '';
    const search = document.getElementById('filter-dispatch-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    dispatchSortColumn = null;
    dispatchSortDirection = 'asc';
    applyDispatchFilters();
}

function toggleDispatchSort(col) {
    if (dispatchSortColumn === col) {
        dispatchSortDirection = dispatchSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dispatchSortColumn = col;
        dispatchSortDirection = 'asc';
    }
    applyDispatchFilters();
}

let isHideCompletedTripsActive = (function() {
    try {
        return localStorage.getItem('bim_hide_completed_trips') === 'true';
    } catch (e) {
        return false;
    }
})();

function updateHideCompletedBtnUI() {
    const btn = document.getElementById('btn-toggle-hide-completed');
    const icon = document.getElementById('icon-toggle-hide-completed');
    const text = document.getElementById('text-toggle-hide-completed');
    if (!btn) return;

    if (isHideCompletedTripsActive) {
        btn.className = 'text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 shadow-2xs px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer';
        if (icon) icon.className = 'ph-bold ph-eye-slash text-teal-800 text-sm';
        if (text) text.innerText = 'Đang Ẩn Đã Xong';
    } else {
        btn.className = 'text-xs font-semibold text-slate-700 hover:text-teal-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer';
        if (icon) icon.className = 'ph-bold ph-eye text-slate-500 text-sm';
        if (text) text.innerText = 'Ẩn Đã Hoàn Thành';
    }
}

function toggleHideCompletedTrips() {
    isHideCompletedTripsActive = !isHideCompletedTripsActive;
    try {
        localStorage.setItem('bim_hide_completed_trips', isHideCompletedTripsActive ? 'true' : 'false');
    } catch (e) {}
    updateHideCompletedBtnUI();
    applyDispatchFilters();
}
window.toggleHideCompletedTrips = toggleHideCompletedTrips;
window.updateHideCompletedBtnUI = updateHideCompletedBtnUI;

function applyDispatchFilters() {
    if (!rawDispatchTrips || !Array.isArray(rawDispatchTrips)) return;

    updateHideCompletedBtnUI();

    const filterCust = document.getElementById('filter-dispatch-customer')?.value?.trim().toLowerCase() || '';
    const filterDrv = document.getElementById('filter-dispatch-driver')?.value?.trim() || '';
    const filterStatus = document.getElementById('filter-dispatch-status')?.value?.trim() || '';
    const filterType = document.getElementById('filter-dispatch-type')?.value?.trim().toUpperCase() || '';
    const filterSearch = document.getElementById('filter-dispatch-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-dispatch-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawDispatchTrips.filter(trip => {
        if (filterCust && (trip.customer || '').toLowerCase() !== filterCust) return false;
        
        if (filterDrv) {
            if (filterDrv.startsWith('DRIVER:')) {
                const targetDrv = filterDrv.replace('DRIVER:', '');
                if (trip.driver !== targetDrv) return false;
            } else if (filterDrv.startsWith('VEHICLE:')) {
                const targetVeh = filterDrv.replace('VEHICLE:', '');
                if (trip.vehicle !== targetVeh) return false;
            }
        }

        // Nếu bật nút "Ẩn Đã Hoàn Thành" (và không đang lọc riêng mục COMPLETED)
        if (isHideCompletedTripsActive && filterStatus !== 'COMPLETED') {
            if (trip.status === 'COMPLETED' || trip.status_raw === 'COMPLETED' || trip.status === 'Hoàn tất & Chốt sổ') {
                return false;
            }
        }

        if (filterStatus === 'ACTIVE') {
            // Lọc các chuyến đang điều vận, ẩn các chuyến đã hoàn thành hoặc đã hủy
            if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || 
                trip.status_raw === 'COMPLETED' || trip.status_raw === 'CANCELLED' || 
                trip.status === 'Hoàn tất & Chốt sổ' || trip.status === 'Đã hủy') {
                return false;
            }
        } else if (!filterStatus || filterStatus === 'ALL') {
            // Mặc định / Tất cả: Hiển thị toàn bộ chuyến xe
        } else if (filterStatus === 'COMPLETED') {
            if (trip.status !== 'COMPLETED' && trip.status_raw !== 'COMPLETED' && trip.status !== 'Hoàn tất & Chốt sổ') return false;
        } else if (filterStatus === 'DROP_HOOK') {
            if (!trip.is_split_trip) return false;
        } else if (filterStatus === 'TWIN_CONT') {
            if (!trip.is_twin_container) return false;
        } else if (filterStatus === 'DET_WARNING') {
            if (!trip.det_status || !['OVERDUE', 'TODAY', 'WARNING'].includes(trip.det_status.status)) return false;
        } else if (filterStatus === 'TRANSIT') {
            if (trip.status !== 'In Transit' && trip.status_raw !== 'TRANSIT' && trip.status !== 'IN_TRANSIT' && trip.status !== 'RETURNING_EMPTY' && trip.status !== 'CONTAINER_PICKED') return false;
        } else if (filterStatus === 'DELIVERED') {
            if (trip.status !== 'Delivered' && trip.status_raw !== 'DELIVERED' && trip.status !== 'AT_WAREHOUSE' && trip.status !== 'UNLOADING') return false;
        } else if (filterStatus === 'PENDING') {
            if (!['Dispatched', 'Picked Up', 'Draft', 'DRAFT', 'DISPATCHED', 'ACCEPTED'].includes(trip.status) && !['DRAFT', 'DISPATCHED', 'ACCEPTED'].includes(trip.status_raw)) return false;
        } else if (trip.status !== filterStatus && trip.status_raw !== filterStatus) {
            return false;
        }

        if (filterType && (trip.type_raw || '').toUpperCase() !== filterType) {
            return false;
        }

        if (filterSearch) {
            const combinedText = [
                trip.id,
                trip.trip_id,
                trip.container,
                trip.container_2,
                trip.booking,
                trip.seal,
                trip.seal_2,
                trip.commercial_invoice,
                trip.customer,
                trip.warehouse,
                trip.driver,
                trip.vehicle,
                trip.tractor,
                trip.trailer,
                trip.subcontractor_name,
                trip.carrier_name,
                trip.subcontractor_driver_name,
                trip.vendor,
                trip.pickup,
                trip.dropoff
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('dispatch-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('dispatch-total-count');
    if (totalCountEl) totalCountEl.innerText = rawDispatchTrips.length;

    // Sắp xếp
    if (dispatchSortColumn) {
        list.sort((a, b) => {
            let valA = a[dispatchSortColumn];
            let valB = b[dispatchSortColumn];

            if (dispatchSortColumn === 'trip_id') {
                const idA = (a.id || a.trip_id || '').toString();
                const idB = (b.id || b.trip_id || '').toString();
                const cmp = idA.localeCompare(idB, 'vi', { numeric: true });
                return dispatchSortDirection === 'asc' ? cmp : -cmp;
            }

            if (dispatchSortColumn === 'vehicle') {
                const cmp = (a.vehicle || '').toString().localeCompare((b.vehicle || '').toString(), 'vi');
                return dispatchSortDirection === 'asc' ? cmp : -cmp;
            }

            if (dispatchSortColumn === 'customer') {
                const cmp = (a.customer || '').toString().localeCompare((b.customer || '').toString(), 'vi');
                return dispatchSortDirection === 'asc' ? cmp : -cmp;
            }

            if (dispatchSortColumn === 'subcontractor_name') {
                const subA = (a.subcontractor_name || a.carrier_name || '').toString();
                const subB = (b.subcontractor_name || b.carrier_name || '').toString();
                const cmp = subA.localeCompare(subB, 'vi');
                return dispatchSortDirection === 'asc' ? cmp : -cmp;
            }

            if (dispatchSortColumn === 'loading_date') {
                valA = a.loading_date_iso || a.loading_date || '';
                valB = b.loading_date_iso || b.loading_date || '';
                const cmp = valA.localeCompare(valB);
                return dispatchSortDirection === 'asc' ? cmp : -cmp;
            }

            if (dispatchSortColumn === 'expense') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
                return dispatchSortDirection === 'asc' ? valA - valB : valB - valA;
            }

            valA = (valA || '').toString();
            valB = (valB || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return dispatchSortDirection === 'asc' ? cmp : -cmp;
        });
    } else {
        // Mặc định: Chuyến mới nhất ở trên đầu
        list.sort((a, b) => {
            const idA = (a.id || '').toString();
            const idB = (b.id || '').toString();
            return idB.localeCompare(idA, 'vi', { numeric: true });
        });
    }

    // Cập nhật icon sort thead
    const sortCols = ['trip_id', 'loading_date', 'customer', 'container', 'vehicle', 'expense', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-dispatch-${col}`);
        if (iconEl) {
            if (dispatchSortColumn === col) {
                iconEl.className = dispatchSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderDispatchTable(list);
}

function renderDispatchTable(trips) {
    const tbody = document.getElementById('trips-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!trips || trips.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-12 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-magnifying-glass text-4xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy chuyến xe nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử xóa từ khóa tìm kiếm hoặc chọn "Đặt lại bộ lọc"</p>
                        <button onclick="resetDispatchFilters()" class="mt-3 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    trips.forEach((trip, idx) => {
        const rawUpper = (trip.type_raw || trip.type || '').toUpperCase();
        const isImport = rawUpper.includes('IMPORT') || rawUpper.includes('NHẬP') || rawUpper.includes('NHAP');
        const isExport = rawUpper.includes('EXPORT') || rawUpper.includes('XUẤT') || rawUpper.includes('XUAT');
        const typeColor = isImport ? 'text-blue-700' : (isExport ? 'text-emerald-700' : 'text-purple-700');
        const displayShipmentType = isImport ? 'Hàng Nhập' : (isExport ? 'Hàng Xuất' : 'Nội Địa');
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const tripIdentifier = trip.hashid || trip.id;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-teal-50/40 transition-colors cursor-pointer group row-multiline border-b border-slate-200/80';
        tr.onclick = (e) => {
            if (!e.target.closest('button, a, input, select')) {
                viewTripDetail(tripIdentifier);
            }
        };
        
                tr.innerHTML = `
            <td data-col-key="stt" class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200/70 font-mono text-xs tabular-nums">
                ${idx + 1}
            </td>
            <td data-col-key="trip_id" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                    <a href="/dispatch/trips/${tripIdentifier}" 
                       onclick="event.preventDefault(); event.stopPropagation(); viewTripDetail('${tripIdentifier}');" 
                       class="font-bold text-teal-700 hover:text-teal-900 hover:underline font-heading font-mono text-[13px] inline-flex items-center gap-1 group/link"
                       title="Xem chi tiết lệnh điều động ${trip.id}">
                        <span>${escapeHtml(formatCodeCompact(trip.id))}</span>
                        <i class="ph ph-arrow-up-right text-[11px] opacity-0 group-hover/link:opacity-100 transition-opacity text-teal-600"></i>
                    </a>
                </div>
            </td>
            <td data-col-key="loading_date" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap">
                <div class="flex items-center space-x-1.5 text-[12px] font-semibold text-slate-700">
                    <i class="ph ph-calendar text-slate-400 text-xs shrink-0"></i>
                    <span>${escapeHtml(trip.loading_date || '-')}</span>
                    ${trip.loading_time ? `<span class="text-slate-300 font-normal">|</span><span class="text-slate-700 font-bold">${escapeHtml(formatTimeString(trip.loading_time))}</span>` : ''}
                </div>
            </td>
            <td data-col-key="customer" class="px-3 py-2 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-snug truncate" title="${escapeHtml(trip.customer)}">${escapeHtml(trip.customer)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate" title="${escapeHtml(trip.warehouse)}">
                    <i class="ph ph-warehouse text-slate-400 text-xs shrink-0"></i>
                    <span>${escapeHtml(trip.warehouse)}</span>
                </p>
            </td>
            <td data-col-key="container" class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5 font-mono font-bold text-slate-900 text-[13px]">
                    <i class="ph ph-barcode text-teal-600 text-sm"></i>
                    <span>${escapeHtml(trip.container)}</span>
                    ${trip.is_twin_container ? `
                        <span class="text-teal-700 font-bold text-[11px] uppercase inline-flex items-center gap-0.5" title="Chế độ Ghép 2 Cont 20ft">
                            <i class="ph-bold ph-stack"></i> 2x20ft
                        </span>
                    ` : ''}
                </div>
                <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 font-medium flex-wrap gap-y-0.5">
                    <span>B/L: <strong class="text-slate-800 font-mono font-bold">${escapeHtml(trip.booking)}</strong></span>
                    ${trip.seal && trip.seal !== '-' ? `<span class="text-slate-300">|</span> <span>Seal: <strong class="text-slate-800 font-mono font-bold">${escapeHtml(trip.seal)}</strong></span>` : ''}
                </div>
                ${trip.is_twin_container && trip.container_2 ? `
                    <div class="text-[11px] font-mono text-slate-600 mt-0.5 flex items-center gap-1">
                        <span class="text-slate-400 font-normal">Cont 2:</span>
                        <strong class="text-teal-900 font-bold">${escapeHtml(trip.container_2)}</strong>
                        ${trip.seal_2 && trip.seal_2 !== '-' ? `<span class="text-slate-300">|</span> <span class="text-slate-500">${escapeHtml(trip.seal_2)}</span>` : ''}
                    </div>
                ` : ''}
                ${trip.det_status && (trip.det_status.status === 'OVERDUE' || trip.det_status.status === 'TODAY' || trip.det_status.status === 'WARNING') ? `
                    <div class="mt-0.5">
                        ${trip.det_status.status === 'OVERDUE' 
                            ? `<span class="text-[11px] font-bold uppercase text-rose-700 font-mono inline-flex items-center gap-0.5 animate-pulse" title="Quá hạn Free DET ${Math.abs(trip.det_status.days_remaining)} ngày">
                                <i class="ph-bold ph-warning"></i> Quá Hạn DET (${Math.abs(trip.det_status.days_remaining)}N)
                               </span>`
                            : trip.det_status.status === 'TODAY'
                            ? `<span class="text-[11px] font-bold uppercase text-amber-700 font-mono inline-flex items-center gap-0.5" title="Hôm nay hết hạn trả vỏ">
                                <i class="ph-bold ph-clock"></i> DET Hết Hôm Nay
                               </span>`
                            : `<span class="text-[11px] font-bold uppercase text-amber-700 font-mono inline-flex items-center gap-0.5" title="Còn 1 ngày Free DET">
                                <i class="ph-bold ph-clock-countdown"></i> DET Còn 1N
                               </span>`
                        }
                    </div>
                ` : ''}
                ${trip.customs_info && trip.customs_info.has_declaration ? `
                    <div class="mt-1 flex items-center space-x-1">
                        ${trip.customs_info.customs_lane === 'GREEN'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Thông quan tự động"><i class="ph-bold ph-check"></i> Luồng Xanh</span>`
                            : trip.customs_info.customs_lane === 'YELLOW'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Thẩm định hồ sơ"><i class="ph-bold ph-file-search"></i> Luồng Vàng</span>`
                            : `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-0.5" title="Tờ khai ${escapeHtml(trip.customs_info.declaration_number)}: Kiểm tra thực tế/Soi chiếu"><i class="ph-bold ph-magnifying-glass"></i> Luồng Đỏ</span>`
                        }
                        <span class="text-[10px] font-mono text-slate-500 font-bold">${escapeHtml(trip.customs_info.declaration_number)}</span>
                    </div>
                ` : ''}
            </td>
            <td data-col-key="invoice_dock" class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    ${trip.commercial_invoice && trip.commercial_invoice !== '-' ? `
                        <span class="font-mono text-xs font-bold text-teal-800" title="Hóa đơn thương mại">
                            <i class="ph ph-file-text"></i> ${escapeHtml(trip.commercial_invoice)}
                        </span>
                    ` : `<span class="text-slate-400 text-[11px] italic">-</span>`}
                </div>
                <div class="mt-0.5">
                    ${trip.warehouse_dock && trip.warehouse_dock !== '-' ? `
                        <span class="text-[11px] font-bold text-indigo-700 font-mono">
                            DOCK: ${escapeHtml(trip.warehouse_dock)}
                        </span>
                    ` : `<span class="text-[11px] text-slate-400 font-medium">Chưa chỉ định dock</span>`}
                </div>
            </td>
            <td data-col-key="vehicle" class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    <span class="font-bold text-slate-900 font-mono text-[13px]">${escapeHtml(trip.vehicle)}</span>
                    ${trip.vehicle_ownership_code === 'OWNED' 
                        ? `<span class="text-[11px] font-bold uppercase text-teal-700">Xe Nhà</span>`
                        : `<span class="text-[11px] font-bold uppercase text-slate-600">Xe Bạn</span>`
                    }
                </div>
                <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    <span>Tài: <strong class="text-slate-900 font-bold">${escapeHtml(trip.driver)}</strong></span>
                    ${trip.is_split_trip ? `
                        <span class="text-amber-700 font-bold text-[11px] uppercase inline-flex items-center gap-0.5" title="Cắt kéo: Chặng 2 hạ do ${escapeHtml(trip.dropoff_driver || 'Tài khác')} đảm nhiệm">
                            <i class="ph-bold ph-arrows-split"></i> Hạ: ${escapeHtml(trip.dropoff_driver || trip.dropoff_vehicle || 'Tài 2')}
                        </span>
                    ` : (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle ? `
                        <span class="text-slate-300">|</span>
                        <span class="text-indigo-700 font-bold font-mono text-[11.5px]" title="Xe hạ bãi">Hạ: ${escapeHtml(trip.dropoff_vehicle)}</span>
                    ` : '')}
                </div>
            </td>
            <td data-col-key="notes" class="px-3 py-2 border-r border-slate-200/70">
                ${trip.cargo_notes ? `
                    <div class="text-[11.5px] text-slate-700 font-medium line-clamp-2 max-w-[210px] flex items-start gap-1" title="${escapeHtml(trip.cargo_notes)}">
                        <i class="ph ph-note-pencil text-amber-600 shrink-0 mt-0.5"></i>
                        <span>${escapeHtml(trip.cargo_notes)}</span>
                    </div>
                ` : `
                    <span class="text-slate-300 font-mono text-xs select-none">-</span>
                `}
            </td>
            <td data-col-key="expense" class="px-3 py-2 border-r border-slate-200/70">
                <div class="text-[12px] font-bold text-slate-800 flex items-center space-x-1 truncate" title="1. Nơi lấy cont: ${escapeHtml(trip.pickup)} ➔ 2. Kho đóng/trả hàng: ${escapeHtml(trip.warehouse)} ➔ 3. Nơi trả cont: ${escapeHtml(trip.dropoff || 'Trả cont')}">
                    <span class="text-teal-700 truncate max-w-[90px]" title="1. Nơi lấy cont: ${escapeHtml(trip.pickup)}">${escapeHtml(trip.pickup)}</span>
                    <i class="ph ph-caret-right text-slate-300 text-xs shrink-0"></i>
                    <span class="text-blue-900 truncate max-w-[90px]" title="2. Kho đóng/trả hàng: ${escapeHtml(trip.warehouse)}">${escapeHtml(trip.warehouse)}</span>
                    <i class="ph ph-caret-right text-slate-300 text-xs shrink-0"></i>
                    <span class="text-amber-800 truncate max-w-[90px]" title="3. Nơi trả cont: ${escapeHtml(trip.dropoff || 'Trả cont')}">${escapeHtml(trip.dropoff || 'Trả cont')}</span>
                </div>
                <div class="mt-0.5 flex items-center space-x-2 text-[11.5px]">
                    <span class="text-[11px] font-bold ${typeColor}">${displayShipmentType}</span>
                    <span class="text-rose-600 font-mono font-bold text-[12px] tabular-nums">${new Intl.NumberFormat('vi-VN').format(trip.expense)} đ</span>
                </div>
            </td>
            <td data-col-key="status" class="px-3 py-2 text-left whitespace-nowrap border-r border-slate-200/70">
                <span class="text-xs ${statusCls}">
                    ${escapeHtml(trip.status_label)}
                </span>
                ${trip.status === 'DISPATCHED' ? `
                    <div class="mt-0.5 text-[11px] font-medium">
                        ${trip.acceptance_sla_status === 'DECLINED' || trip.declined_at ? `
                            <span class="text-rose-700 font-bold" title="Tài xế đã TỪ CHỐI nhận chuyến: ${escapeHtml(trip.decline_reason || 'Không rõ lý do')}">
                                TX từ chối (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : trip.acceptance_sla_status === 'OVERDUE' ? `
                            <span class="text-rose-600 font-bold" title="Tài xế chưa nhận chuyến sau hơn 60 phút">
                                Quá hạn (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : trip.acceptance_sla_status === 'WARNING' ? `
                            <span class="text-amber-700" title="Chờ tài xế xác nhận nhận chuyến">
                                Chờ TX (${trip.minutes_since_dispatch}p)
                            </span>
                        ` : `
                            <span class="text-slate-500" title="Đã phát lệnh qua Zalo/App">
                                Chờ nhận (${trip.minutes_since_dispatch}p)
                            </span>
                        `}
                    </div>
                ` : ''}
            </td>
            <!-- 31 Cột Mở Rộng Từ Database (Ẩn mặc định, hiển thị khi người dùng tick chọn trong modal) -->
            <td data-col-key="customer_short" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-bold text-slate-800 text-[12.5px]" style="display:none">
                ${escapeHtml((trip.customer_short_name || trip.customer || '-').toUpperCase())}
            </td>
            <td data-col-key="customer_code" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-teal-800 text-xs" style="display:none">
                ${escapeHtml(trip.customer_code || '-')}
            </td>
            <td data-col-key="shipment_type" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap text-xs font-bold ${typeColor}" style="display:none">
                ${displayShipmentType}
            </td>
            <td data-col-key="container_type" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap text-xs font-bold text-teal-800" style="display:none">
                ${escapeHtml(trip.container_type || 'Cont 40')}
            </td>
            <td data-col-key="container_number" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-slate-900 text-[13px]" style="display:none">
                ${escapeHtml(trip.container || '-')}
            </td>
            <td data-col-key="seal_number" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-semibold text-slate-700 text-xs" style="display:none">
                ${escapeHtml(trip.seal || '-')}
            </td>
            <td data-col-key="booking_number" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-indigo-700 text-xs" style="display:none">
                ${escapeHtml(trip.booking || '-')}
            </td>
            <td data-col-key="shipping_line" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-bold text-blue-700 text-xs" style="display:none">
                ${escapeHtml(trip.shipping_line || '-')}
            </td>
            <td data-col-key="cutoff_time" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-rose-600 text-xs" style="display:none">
                ${escapeHtml(trip.cutoff || '-')}
            </td>
            <td data-col-key="det_expiry" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-semibold text-slate-700 text-xs" style="display:none">
                ${escapeHtml(trip.det_expiry_date || '-')}
            </td>
            <td data-col-key="dem_expiry" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-semibold text-slate-700 text-xs" style="display:none">
                ${escapeHtml(trip.dem_expiry_date || '-')}
            </td>
            <!-- 1. NƠI LẤY CONT -->
            <td data-col-key="pickup_location" class="px-3 py-2 border-r border-slate-200/70 text-xs" style="display:none">
                <div class="flex items-center gap-1.5 truncate max-w-[200px]" title="1. Nơi lấy cont: ${escapeHtml(trip.pickup || '-')}">
                    <span class="px-1.5 py-0.2 rounded font-bold font-heading uppercase text-[9.5px] shrink-0 ${isExport ? 'bg-teal-50 text-teal-700 border border-teal-200' : (isImport ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200')}">
                        ${isExport ? 'Lấy Vỏ' : (isImport ? 'Lấy Hàng' : 'Nhận Hàng')}
                    </span>
                    <span class="font-bold text-slate-800 truncate">${escapeHtml(trip.pickup || '-')}</span>
                </div>
            </td>
            <!-- 2. KHO ĐÓNG/ TRẢ HÀNG -->
            <td data-col-key="warehouse_location" class="px-3 py-2 border-r border-slate-200/70 text-xs" style="display:none">
                <div class="flex items-center gap-1.5 truncate max-w-[200px]" title="2. Kho đóng/trả hàng: ${escapeHtml(trip.warehouse || '-')}">
                    <span class="px-1.5 py-0.2 rounded font-bold font-heading uppercase text-[9.5px] shrink-0 ${isExport ? 'bg-blue-50 text-blue-700 border border-blue-200' : (isImport ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200')}">
                        ${isExport ? 'Đóng Hàng' : (isImport ? 'Dỡ Hàng' : 'Giao Nhận')}
                    </span>
                    <span class="font-bold text-slate-800 truncate">${escapeHtml(trip.warehouse || '-')}</span>
                </div>
            </td>
            <!-- 3. NƠI TRẢ CONT -->
            <td data-col-key="dropoff_location" class="px-3 py-2 border-r border-slate-200/70 text-xs" style="display:none">
                <div class="flex items-center gap-1.5 truncate max-w-[200px]" title="3. Nơi trả cont: ${escapeHtml(trip.dropoff || '-')}">
                    <span class="px-1.5 py-0.2 rounded font-bold font-heading uppercase text-[9.5px] shrink-0 ${isExport ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (isImport ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200')}">
                        ${isExport ? 'Hạ Hàng' : (isImport ? 'Trả Rỗng' : 'Trả Cont')}
                    </span>
                    <span class="font-bold text-slate-800 truncate">${escapeHtml(trip.dropoff || '-')}</span>
                </div>
            </td>
            <td data-col-key="commercial_invoice" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono text-xs font-bold text-teal-800" style="display:none">
                ${escapeHtml(trip.commercial_invoice || '-')}
            </td>
            <td data-col-key="warehouse_dock" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-indigo-700 text-xs" style="display:none">
                ${escapeHtml(trip.warehouse_dock || '-')}
            </td>
            <td data-col-key="fleet_type" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap text-xs font-bold" style="display:none">
                ${trip.vehicle_ownership_code === 'OWNED' 
                    ? '<span class="font-bold uppercase text-[10.5px] text-emerald-700">Xe Nhà</span>'
                    : '<span class="font-bold uppercase text-[10.5px] text-amber-700">Xe Bạn (Thầu)</span>'
                }
            </td>
            <td data-col-key="license_plate" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-slate-900 text-xs" style="display:none">
                ${escapeHtml(trip.vehicle || '-')}
            </td>
            <td data-col-key="trailer_plate" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-slate-700 text-xs" style="display:none">
                ${escapeHtml(trip.trailer || '-')}
            </td>
            <td data-col-key="driver_name" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-bold text-slate-800 text-xs" style="display:none">
                ${escapeHtml(trip.driver || '-')}
            </td>
            <td data-col-key="driver_phone" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono text-slate-600 text-xs" style="display:none">
                ${escapeHtml(trip.driver_phone || '-')}
            </td>
            <td data-col-key="dropoff_vehicle" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-indigo-700 text-xs" style="display:none">
                ${escapeHtml(trip.dropoff_vehicle || '-')}
            </td>
            <td data-col-key="dropoff_driver" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-semibold text-slate-700 text-xs" style="display:none">
                ${escapeHtml(trip.dropoff_driver || '-')}
            </td>
            <td data-col-key="subcontractor_name" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-semibold text-slate-800 text-xs" style="display:none">
                ${escapeHtml(trip.subcontractor_name || '-')}
            </td>
            <td data-col-key="customs_declaration" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap text-xs" style="display:none">
                ${trip.customs_info && trip.customs_info.has_declaration ? `
                    <span class="font-mono font-bold text-slate-800">${escapeHtml(trip.customs_info.declaration_number)}</span>
                ` : '<span class="text-slate-400 font-normal italic">-</span>'}
            </td>
            <td data-col-key="cont_location_type" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-bold text-xs ${trip.cont_location_type === 'BÃI TVL' ? 'text-purple-700' : 'text-slate-600'}" style="display:none">
                ${escapeHtml(trip.cont_location_type || '-')}
            </td>
            <td data-col-key="cargo_notes" class="px-3 py-2 border-r border-slate-200/70 text-xs text-slate-600 truncate max-w-[200px]" style="display:none" title="${escapeHtml(trip.cargo_notes || '-')}">
                ${escapeHtml(trip.cargo_notes || '-')}
            </td>
            <td data-col-key="revenue" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-emerald-700 text-xs tabular-nums" style="display:none">
                ${new Intl.NumberFormat('vi-VN').format(trip.revenue || 0)} đ
            </td>
            <td data-col-key="dispatch_cost" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-rose-600 text-xs tabular-nums" style="display:none">
                ${new Intl.NumberFormat('vi-VN').format(trip.expense || 0)} đ
            </td>
            <td data-col-key="profit" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono font-bold text-teal-800 text-xs tabular-nums" style="display:none">
                ${new Intl.NumberFormat('vi-VN').format(trip.profit || 0)} đ
            </td>
            <td data-col-key="created_at" class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap font-mono text-slate-600 text-xs" style="display:none">
                ${escapeHtml(trip.startTime || '-')}
            </td>
            <!-- Cột Thao Tác Cố Định -->
            <td data-col-key="actions" class="px-2 py-2 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1 justify-center">
                    <button type="button" onclick="event.stopPropagation(); viewTripDetail('${tripIdentifier}')" 
                        class="px-2 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                        title="Xem chi tiết phiếu điều độ ${trip.id}">
                        <i class="ph-bold ph-eye"></i>
                        <span>Xem</span>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); openModalEditTrip('${tripIdentifier}')" 
                        class="px-2 py-1 bg-transparent hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-300 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                        title="Hiệu chỉnh thông tin lệnh điều động ${trip.id}">
                        <i class="ph-bold ph-note-pencil text-teal-600"></i>
                        <span>Sửa</span>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); deleteOrCancelTrip('${tripIdentifier}')" 
                        class="px-2 py-1 bg-transparent hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-300 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer"
                        title="Xóa phiếu điều độ ${trip.id}">
                        <i class="ph-bold ph-trash"></i>
                        <span>Xóa</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Tự động đồng bộ và áp dụng trạng thái ẩn/hiện & thứ tự cột đã lưu
    if (window.BimTableColumnManager) {
        window.BimTableColumnManager.apply('dispatch-trips-table');
    }


    if (window.BimTableFooter) {
        const totalDispatchExpenses = trips.reduce((sum, t) => sum + (Number(t.expense) || 0), 0);
        window.BimTableFooter.render('dispatch-trips-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${trips.length}</span> chuyến xe hiển thị`, colspan: 7, class: 'text-slate-700' },
                { html: `<span class="text-rose-600 font-mono font-black tabular-nums">${new Intl.NumberFormat('vi-VN').format(totalDispatchExpenses)} đ</span>`, align: 'left' },
                { text: '', align: 'center' },
                { text: '', align: 'center' }
            ]
        });
    }
}

async function loadTripsData() {
    try {
        const period = document.getElementById('filter-dispatch-period')?.value || 'this_month';
        let url = '/api/trips/';
        if (period !== 'all') {
            const dateRange = getDateRangeForPeriod(period);
            url += `?from_date=${dateRange.fromDate}&to_date=${dateRange.toDate}`;
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Lỗi tải danh sách chuyến');
        const data = await res.json();

        // Cập nhật 5 Thẻ Vận Hành Chiến Lược Trang Điều Vận (TMS Dispatch Pipeline)
        const stats = data.stats || {};
        const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

        // Thẻ 1: Tổng kế hoạch điều độ
        const plan = stats.card_plan || {};
        const totalTripsVal = plan.total_trips !== undefined ? plan.total_trips : (stats.total_trips_monthly || 0);
        const elTotalTrips = document.getElementById('dispatch-stat-total-trips') || document.getElementById('stat-total-trips');
        if (elTotalTrips) elTotalTrips.innerText = fmtNum(totalTripsVal);
        const elTotalTripsLegacy = document.getElementById('stat-total-trips');
        if (elTotalTripsLegacy && elTotalTripsLegacy !== elTotalTrips) elTotalTripsLegacy.innerText = fmtNum(totalTripsVal);

        const elPlanL1 = document.getElementById('dispatch-plan-line1');
        if (elPlanL1) elPlanL1.innerText = plan.line_1 || `${fmtNum(totalTripsVal)} Chuyến (${fmtNum(plan.total_containers || totalTripsVal)} Cont)`;
        const elPlanL2 = document.getElementById('dispatch-plan-line2');
        if (elPlanL2) elPlanL2.innerText = plan.line_2 || `${fmtNum(plan.owned_vehicles || 0)} Xe Nhà · ${fmtNum(plan.subcontractor_vehicles || 0)} Thầu Phụ`;

        // Thẻ 2: Chờ nhận lệnh & xuất bãi
        const pending = stats.card_pending || {};
        const elPendingTrips = document.getElementById('dispatch-stat-pending-trips');
        if (elPendingTrips) elPendingTrips.innerText = fmtNum(pending.pending_count || 0);
        const elPendingL1 = document.getElementById('dispatch-pending-line1');
        if (elPendingL1) elPendingL1.innerText = pending.line_1 || `Đã phát lệnh: ${fmtNum(pending.pending_count || 0)}`;
        const elPendingL2 = document.getElementById('dispatch-pending-line2');
        if (elPendingL2) elPendingL2.innerText = pending.line_2 || `Cảnh báo SLA: ${fmtNum(pending.sla_warning_count || 0)}`;

        // Thẻ 3: Đang lăn bánh trên đường
        const transit = stats.card_transit || {};
        const transitVal = transit.transit_count !== undefined ? transit.transit_count : (stats.transit_count || 0);
        const elTransitTrips = document.getElementById('dispatch-stat-transit-trips') || document.getElementById('stat-transit');
        if (elTransitTrips) elTransitTrips.innerText = fmtNum(transitVal);
        const elTransitTripsLegacy = document.getElementById('stat-transit');
        if (elTransitTripsLegacy && elTransitTripsLegacy !== elTransitTrips) elTransitTripsLegacy.innerText = fmtNum(transitVal);

        const elTransitL1 = document.getElementById('dispatch-transit-line1');
        if (elTransitL1) elTransitL1.innerText = transit.line_1 || `Đang chở hàng: ${fmtNum(transit.carrying_cargo_count || transitVal)}`;
        const elTransitL2 = document.getElementById('dispatch-transit-line2');
        if (elTransitL2) elTransitL2.innerText = transit.line_2 || `Cắt kéo / Rỗng: ${fmtNum(transit.returning_or_split_count || 0)}`;

        // Thẻ 4: Cảnh báo rủi ro (Cắt máng / Lưu ca)
        const risk = stats.card_risk || {};
        const riskVal = risk.risk_count !== undefined ? risk.risk_count : (stats.cutoff_warning_count || 0);
        const elRiskTrips = document.getElementById('dispatch-stat-risk-trips');
        if (elRiskTrips) elRiskTrips.innerText = fmtNum(riskVal);
        const elCutoffLegacy = document.getElementById('stat-cutoff-warning');
        if (elCutoffLegacy) elCutoffLegacy.innerText = fmtNum(risk.cutoff_count || stats.cutoff_warning_count || 0);
        const elPendExpLegacy = document.getElementById('stat-pending-expenses');
        if (elPendExpLegacy) elPendExpLegacy.innerText = fmtNum(stats.pending_expenses_count || 0);

        const elRiskL1 = document.getElementById('dispatch-risk-line1');
        if (elRiskL1) elRiskL1.innerText = risk.line_1 || `Gần cắt máng: ${fmtNum(risk.cutoff_count || 0)}`;
        const elRiskL2 = document.getElementById('dispatch-risk-line2');
        if (elRiskL2) elRiskL2.innerText = risk.line_2 || `Hạn rỗng / kho: ${fmtNum(risk.detention_count || 0)}`;

        // Thẻ 5: Đã giao hàng & thu hồi POD
        const delivered = stats.card_delivered || {};
        const elDeliveredTrips = document.getElementById('dispatch-stat-delivered-trips');
        if (elDeliveredTrips) elDeliveredTrips.innerText = fmtNum(delivered.delivered_count || 0);
        const elDeliveredL1 = document.getElementById('dispatch-delivered-line1');
        if (elDeliveredL1) elDeliveredL1.innerText = delivered.line_1 || `Đã có POD: ${fmtNum(delivered.pod_completed_count || 0)}`;
        const elDeliveredL2 = document.getElementById('dispatch-delivered-line2');
        if (elDeliveredL2) elDeliveredL2.innerText = delivered.line_2 || `Chờ thu hồi: ${fmtNum(delivered.pod_pending_count || 0)}`;

        rawDispatchTrips = data.trips || [];
        populateDispatchFilterDropdowns(rawDispatchTrips);
        applyDispatchFilters();
    } catch (err) {
        console.error('Error loading trips data:', err);
    }
}

function handleDispatchSortChange(sortVal) {
    if (!sortVal) {
        dispatchSortColumn = 'trip_id';
        dispatchSortDirection = 'desc';
    } else if (sortVal === 'trip_id_asc') {
        dispatchSortColumn = 'trip_id';
        dispatchSortDirection = 'asc';
    } else if (sortVal === 'trip_id_desc') {
        dispatchSortColumn = 'trip_id';
        dispatchSortDirection = 'desc';
    } else if (sortVal === 'vehicle_asc') {
        dispatchSortColumn = 'vehicle';
        dispatchSortDirection = 'asc';
    } else if (sortVal === 'customer_asc') {
        dispatchSortColumn = 'customer';
        dispatchSortDirection = 'asc';
    } else if (sortVal === 'subcontractor_asc') {
        dispatchSortColumn = 'subcontractor_name';
        dispatchSortDirection = 'asc';
    }
    applyDispatchFilters();
}
window.handleDispatchSortChange = handleDispatchSortChange;
