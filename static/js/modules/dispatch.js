/**
 * BIM LOGISTICS — MODULE ĐIỀU VẬN & QUẢN LÝ CHUYẾN XE (DISPATCH & TRIPS)
 */

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
                const idA = (a.id || '').toString();
                const idB = (b.id || '').toString();
                const cmp = idA.localeCompare(idB, 'vi', { numeric: true });
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
                <td colspan="9" class="text-center py-12 text-slate-400">
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

    trips.forEach(trip => {
        const typeColor = trip.type_raw === 'IMPORT' ? 'bg-blue-100 text-blue-700' : 
                          trip.type_raw === 'EXPORT' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700';
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
            <td class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap">
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
            <td class="px-3 py-2 border-r border-slate-200/70 whitespace-nowrap">
                <div class="flex items-center space-x-1.5 text-[12px] font-semibold text-slate-700">
                    <i class="ph ph-calendar text-slate-400 text-xs shrink-0"></i>
                    <span>${escapeHtml(trip.loading_date || '-')}</span>
                    ${trip.loading_time ? `<span class="text-slate-300 font-normal">|</span><span class="text-slate-700 font-bold">${escapeHtml(formatTimeString(trip.loading_time))}</span>` : ''}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <p class="font-bold text-slate-900 text-[13px] leading-snug truncate" title="${escapeHtml(trip.customer)}">${escapeHtml(trip.customer)}</p>
                <p class="text-[11.5px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 truncate" title="${escapeHtml(trip.warehouse)}">
                    <i class="ph ph-warehouse text-slate-400 text-xs shrink-0"></i>
                    <span>${escapeHtml(trip.warehouse)}</span>
                </p>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5 font-mono font-bold text-slate-900 text-[13px]">
                    <i class="ph ph-barcode text-teal-600 text-sm"></i>
                    <span>${escapeHtml(trip.container)}</span>
                    ${trip.is_twin_container ? `
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-300 inline-flex items-center gap-0.5" title="Chế độ Ghép 2 Cont 20ft">
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
                    <div class="mt-1">
                        ${trip.det_status.status === 'OVERDUE' 
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-0.5 animate-pulse" title="Quá hạn Free DET ${Math.abs(trip.det_status.days_remaining)} ngày">
                                <i class="ph-bold ph-warning"></i> Quá Hạn DET (${Math.abs(trip.det_status.days_remaining)}N)
                               </span>`
                            : trip.det_status.status === 'TODAY'
                            ? `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5" title="Hôm nay hết hạn trả vỏ">
                                <i class="ph-bold ph-clock"></i> DET Hết Hôm Nay
                               </span>`
                            : `<span class="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5" title="Còn 1 ngày Free DET">
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
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    ${trip.commercial_invoice && trip.commercial_invoice !== '-' ? `
                        <span class="font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shadow-2xs" title="Hóa đơn thương mại">
                            <i class="ph ph-file-text"></i> ${escapeHtml(trip.commercial_invoice)}
                        </span>
                    ` : `<span class="text-slate-400 text-[11.5px] italic">-</span>`}
                </div>
                <div class="mt-0.5">
                    ${trip.warehouse_dock && trip.warehouse_dock !== '-' ? `
                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-heading">
                            DOCK: ${escapeHtml(trip.warehouse_dock)}
                        </span>
                    ` : `<span class="text-[11.5px] text-slate-400 font-medium">Chưa chỉ định dock</span>`}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center space-x-1.5">
                    <span class="font-bold text-slate-900 font-mono text-[13px]">${escapeHtml(trip.vehicle)}</span>
                    ${trip.vehicle_ownership_code === 'OWNED' 
                        ? `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-teal-100 text-teal-800 border border-teal-200">Xe Nhà</span>`
                        : `<span class="px-1.5 py-0.2 text-[10.5px] font-black uppercase rounded bg-amber-100 text-amber-800 border border-amber-200">Xe Bạn</span>`
                    }
                </div>
                <div class="text-[11.5px] text-slate-500 mt-0.5 flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    <span>Tài: <strong class="text-slate-900 font-bold">${escapeHtml(trip.driver)}</strong></span>
                    ${trip.is_split_trip ? `
                        <span class="text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded font-black text-[10px] uppercase inline-flex items-center gap-0.5" title="Cắt kéo: Chặng 2 hạ do ${escapeHtml(trip.dropoff_driver || 'Tài khác')} đảm nhiệm">
                            <i class="ph-bold ph-arrows-split"></i> Hạ: ${escapeHtml(trip.dropoff_driver || trip.dropoff_vehicle || 'Tài 2')}
                        </span>
                    ` : (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle ? `
                        <span class="text-slate-300">|</span>
                        <span class="text-indigo-700 font-bold font-mono text-[11.5px]" title="Xe hạ bãi">Hạ: ${escapeHtml(trip.dropoff_vehicle)}</span>
                    ` : '')}
                </div>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="flex items-center">
                    <span class="px-1.5 py-0.2 rounded text-[10.5px] font-bold uppercase tracking-wider ${trip.cont_location_type === 'BÃI TVL' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                        <i class="ph ph-map-pin"></i> ${escapeHtml(trip.cont_location_type)}
                    </span>
                </div>
                <p class="text-[11.5px] text-slate-500 font-medium italic line-clamp-1 max-w-[200px] mt-0.5" title="${escapeHtml(trip.cargo_notes || 'Không có lưu ý')}">
                    ${trip.cargo_notes ? `<i class="ph ph-info text-amber-600"></i> ${escapeHtml(trip.cargo_notes)}` : '<span class="text-slate-400 font-normal">Không có lưu ý</span>'}
                </p>
            </td>
            <td class="px-3 py-2 border-r border-slate-200/70">
                <div class="text-[13px] font-bold text-slate-800 flex items-center space-x-1.5 truncate" title="${escapeHtml(trip.pickup)} ➔ ${escapeHtml(trip.dropoff || 'Hạ bãi')}">
                    <span class="text-teal-700">${escapeHtml(trip.pickup)}</span>
                    <i class="ph ph-arrow-right text-slate-400 text-xs shrink-0"></i>
                    <span class="text-indigo-700">${escapeHtml(trip.dropoff || 'Bãi rỗng')}</span>
                </div>
                <div class="mt-0.5 flex items-center space-x-2 text-[11.5px]">
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-black uppercase font-heading ${typeColor}">${escapeHtml(trip.type)}</span>
                    <span class="text-rose-600 font-mono font-bold text-[12px] tabular-nums">${new Intl.NumberFormat('vi-VN').format(trip.expense)} đ</span>
                </div>
            </td>
            <td class="px-3 py-2 text-center whitespace-nowrap">
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
        `;
        tbody.appendChild(tr);
    });
}

async function loadTripsData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/trips/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải danh sách chuyến');
        const data = await res.json();

        // Cập nhật stats
        const totalTripsEl = document.getElementById('stat-total-trips');
        if (totalTripsEl) totalTripsEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.total_trips_monthly || 0);
        const transitEl = document.getElementById('stat-transit');
        if (transitEl) transitEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.transit_count || 0);
        const pendExpEl = document.getElementById('stat-pending-expenses');
        if (pendExpEl) pendExpEl.innerText = new Intl.NumberFormat('vi-VN').format(data.stats.pending_expenses_count || 0);

        rawDispatchTrips = data.trips || [];
        populateDispatchFilterDropdowns(rawDispatchTrips);
        applyDispatchFilters();
    } catch (err) {
        console.error('Error loading trips data:', err);
    }
}

// --- 3. XEM CHI TIẾT CHUYẾN XE & BẢNG KÊ CHI PHÍ TRIỀN VÕ ---
async function viewTripDetail(tripCode, updateHistory = true) {
    currentActiveTripCode = tripCode;
    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`);
        if (!res.ok) {
            let errorMsg = 'Không tìm thấy chuyến xe.';
            try {
                const errData = await res.json();
                errorMsg = errData.error || errData.detail || `Lỗi máy chủ (${res.status})`;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        const trip = await res.json();
        currentActiveTripData = trip;
        const tripHash = trip.hashid || trip.id;
        currentActiveTripCode = trip.id; // Luôn dùng trip_code gốc cho các API con

        // Cập nhật URL chuẩn Semantic Path kèm HashID bảo mật: /dispatch/trips/<hashid>
        if (updateHistory && window.history && window.history.pushState) {
            const tripPath = `/dispatch/trips/${tripHash}`;
            if (window.location.pathname !== tripPath) {
                window.history.pushState({ view: 'trip-detail', tripIdentifier: tripHash }, '', tripPath);
            }
        }

        // Lưu vết tab trước đó để nút Quay lại hoạt động chuẩn xác
        const currentActiveView = document.querySelector('.view:not(.hidden-view)');
        if (currentActiveView && currentActiveView.id !== 'view-trip-detail') {
            previousActiveTab = currentActiveView.id.replace('view-', '');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const detailView = document.getElementById('view-trip-detail');
        if (detailView) detailView.classList.remove('hidden-view');

        // Cập nhật Tiêu đề Phân hệ trên Topbar
        const topbarTitleEl = document.getElementById('topbar-page-title');
        if (topbarTitleEl) {
            const originTab = (previousActiveTab === 'ke-toan' ? 'Kế toán' : 'Điều vận');
            topbarTitleEl.innerText = `${originTab} | Chi tiết chuyến ${trip.id || trip.trip_code || ''}`;
        }

        window.currentTripDetail = trip;

        // Helper gán text an toàn chống crash DOM
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = (val !== undefined && val !== null) ? val : '-';
        };

        // Thông tin chung
        setText('detail-id', trip.id);
        setText('detail-type', trip.type);
        setText('detail-customer', trip.customer);
        setText('detail-driver', trip.driver);
        setText('detail-vehicle-plate', trip.vehicle);

        // Phân loại nguồn xe
        const ownerBadge = document.getElementById('detail-ownership-badge');
        if (ownerBadge) {
            if (trip.vehicle_ownership_code === 'OWNED') {
                ownerBadge.innerText = 'Xe Nhà';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200';
            } else {
                ownerBadge.innerText = 'Xe Bạn';
                ownerBadge.className = 'text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200';
            }
        }

        // Cấu hình Chặng & Xe hạ (Nghiệp vụ Cắt Kéo)
        const dropoffVehEl = document.getElementById('detail-dropoff-vehicle-info');
        if (dropoffVehEl) {
            if (trip.is_split_trip) {
                dropoffVehEl.innerHTML = `
                    <div class="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                        <div class="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200 pb-1">
                            <span class="flex items-center gap-1">
                                <i class="ph-bold ph-arrows-split text-amber-700"></i>
                                Chế độ Cắt Kéo (Drop & Hook)
                            </span>
                            <span class="text-[10.5px] bg-amber-200/80 px-1.5 py-0.2 rounded font-black">2 Chặng</span>
                        </div>
                        <p class="pt-0.5">• <strong>Chặng 1 (Lấy Cont):</strong> ${trip.driver} (Xe: ${trip.vehicle}) · Chia lương: ${trip.driver_split_ratio}%</p>
                        <p>• <strong>Chặng 2 (Hạ Bãi):</strong> ${trip.dropoff_driver || 'Chưa gán tài xế'} (Xe: ${trip.dropoff_vehicle || '-'}) · Chia lương: ${100 - trip.driver_split_ratio}%</p>
                    </div>
                `;
                dropoffVehEl.classList.remove('hidden');
            } else if (trip.dropoff_vehicle && trip.dropoff_vehicle !== '-' && trip.dropoff_vehicle !== trip.vehicle) {
                dropoffVehEl.innerText = `Xe hạ: ${trip.dropoff_vehicle}`;
                dropoffVehEl.classList.remove('hidden');
            } else {
                dropoffVehEl.innerText = '';
                dropoffVehEl.classList.add('hidden');
            }
        }
        
        setText('detail-cont', trip.container);
        const contTypeEl = document.getElementById('detail-cont-type');
        if (contTypeEl) {
            if (trip.is_twin_container) {
                contTypeEl.innerText = 'Chế độ: Ghép 2x20ft';
            } else if (trip.vgm_weight && trip.vgm_weight !== '-') {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'} | VGM: ${trip.vgm_weight}`;
            } else {
                contTypeEl.innerText = `Loại: ${trip.container_type || 'Cont 40'}`;
            }
        }

        // Cập nhật Box Ghép 2 Cont 20ft
        const twinCard = document.getElementById('detail-twin-container-card');
        if (twinCard) {
            if (trip.is_twin_container) {
                twinCard.classList.remove('hidden');
                setText('detail-cont-1-no', trip.container || '-');
                setText('detail-cont-1-seal', trip.seal || '-');
                setText('detail-cont-1-booking', trip.booking || '-');
                const vgm1El = document.getElementById('detail-cont-1-vgm');
                if (vgm1El) vgm1El.innerText = trip.vgm_weight && trip.vgm_weight !== '-' ? `VGM: ${trip.vgm_weight}` : 'VGM: -';

                setText('detail-cont-2-no', trip.container_2 || 'Chưa cập nhật');
                setText('detail-cont-2-seal', trip.seal_2 || '-');
                setText('detail-cont-2-booking', trip.booking_2 || trip.booking || '-');
                const vgm2El = document.getElementById('detail-cont-2-vgm');
                if (vgm2El) vgm2El.innerText = trip.vgm_weight_2 ? `VGM: ${trip.vgm_weight_2}` : 'VGM: -';
                setText('detail-cont-2-notes', trip.cargo_notes_2 || 'Không có ghi chú riêng');
            } else {
                twinCard.classList.add('hidden');
            }
        }

        // Cập nhật Box Quản lý DEM/DET & Giám định Vỏ Cont (EIR)
        setText('detail-det-days', `${trip.det_free_days || 3} ngày`);
        setText('detail-det-expiry', trip.det_expiry_date || 'Chưa thiết lập');
        setText('detail-dem-days', `${trip.dem_free_days || 3} ngày`);
        setText('detail-dem-expiry', trip.dem_expiry_date || 'Chưa thiết lập');
        setText('detail-condition-label', trip.container_condition_label || 'Nguyên Vẹn / Đạt Chuẩn');
        setText('detail-damage-desc', trip.damage_description || (trip.container_condition === 'GOOD' ? 'Vỏ cont sạch sẽ, nguyên vẹn, không hư hỏng' : 'Không có ghi chú thêm'));

        const condBadge = document.getElementById('detail-condition-badge');
        if (condBadge) {
            if (trip.container_condition === 'DAMAGED') {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200';
                condBadge.innerText = 'Hư hỏng (EIR)';
            } else if (trip.container_condition === 'CLEANING_REQUIRED') {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200';
                condBadge.innerText = 'Cần vệ sinh';
            } else {
                condBadge.className = 'text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200';
                condBadge.innerText = 'Đạt chuẩn';
            }
        }

        const detBadgeEl = document.getElementById('detail-det-status-badge');
        const detCountdownEl = document.getElementById('detail-det-countdown');
        if (trip.det_status) {
            const ds = trip.det_status;
            if (detBadgeEl) {
                if (ds.status === 'OVERDUE') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-100 text-rose-800 border border-rose-300 animate-pulse';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-warning-circle mr-1"></i> Quá Hạn Phạt Tiền (${Math.abs(ds.days_remaining)} ngày)`;
                } else if (ds.status === 'TODAY') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase font-heading bg-rose-50 text-rose-700 border border-rose-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-clock mr-1"></i> Hạn Chót Hôm Nay`;
                } else if (ds.status === 'WARNING') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-100 text-amber-800 border border-amber-300';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass mr-1"></i> Sắp Hết Hạn (1 ngày)`;
                } else if (ds.status === 'ATTENTION') {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-amber-50 text-amber-700 border border-amber-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-hourglass-low mr-1"></i> Còn 2 ngày Free DET`;
                } else {
                    detBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase font-heading bg-emerald-100 text-emerald-800 border border-emerald-200';
                    detBadgeEl.innerHTML = `<i class="ph-bold ph-check-circle mr-1"></i> Trong Hạn Free-time (${ds.days_remaining} ngày)`;
                }
            }
            if (detCountdownEl) {
                if (ds.status === 'OVERDUE') {
                    detCountdownEl.innerText = `Cảnh báo: Đã vượt quá hạn mượn vỏ ${Math.abs(ds.days_remaining)} ngày! Đang phát sinh phí lưu vỏ của hãng tàu.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else if (ds.status === 'TODAY') {
                    detCountdownEl.innerText = `Lưu ý: Hạn trả rỗng hạ bãi là ngày hôm nay. Cần ưu tiên xếp xe hạ cont trước 17H.`;
                    detCountdownEl.className = 'text-[11px] text-rose-700 mt-1 font-bold';
                } else {
                    detCountdownEl.innerText = `Thời gian mượn vỏ còn lại: ${ds.days_remaining} ngày an toàn.`;
                    detCountdownEl.className = 'text-[11px] text-amber-800 mt-1 font-medium';
                }
            }
        }

        // Vị trí cont
        const contLocBadge = document.getElementById('detail-cont-location-badge');
        if (contLocBadge) contLocBadge.innerText = trip.cont_location_type || 'Nhà máy';

        setText('detail-booking', trip.booking !== '-' ? `B/L: ${trip.booking}` : 'B/L: Chưa có');
        setText('detail-seal', trip.seal !== '-' ? `Seal: ${trip.seal}` : 'Seal: Chưa cập nhật');
        
        // Commercial Invoice & Dock
        const invoiceEl = document.getElementById('detail-invoice');
        if (invoiceEl) invoiceEl.innerText = trip.commercial_invoice || '-';
        const dockEl = document.getElementById('detail-dock');
        if (dockEl) dockEl.innerText = trip.warehouse_dock && trip.warehouse_dock !== '-' ? `DOCK: ${trip.warehouse_dock}` : 'DOCK: Chưa chỉ định';

        // 5 Mốc thời gian tại kho khách hàng
        const etaEl = document.getElementById('detail-eta-time');
        if (etaEl) etaEl.innerText = trip.eta_warehouse_time || '-';
        const callInEl = document.getElementById('detail-call-in-time');
        if (callInEl) callInEl.innerText = trip.warehouse_call_in_time || '-';
        const actualInEl = document.getElementById('detail-actual-in-time');
        if (actualInEl) actualInEl.innerText = trip.actual_gate_in_time || '-';
        const callOutEl = document.getElementById('detail-call-out-time');
        if (callOutEl) callOutEl.innerText = trip.warehouse_call_out_time || '-';
        const actualOutEl = document.getElementById('detail-actual-out-time');
        if (actualOutEl) actualOutEl.innerText = trip.actual_gate_out_time || '-';

        // 2 Mốc bổ sung thực tiễn: Hẹn hạ sau 0h & Hạ bãi thực tế
        const dropoffAppointEl = document.getElementById('detail-dropoff-appointment-time');
        if (dropoffAppointEl) dropoffAppointEl.innerText = trip.dropoff_appointment_time || '-';
        const actualDropoffEl = document.getElementById('detail-actual-dropoff-time');
        if (actualDropoffEl) actualDropoffEl.innerText = trip.actual_dropoff_time || '-';

        // Cập nhật Cảnh báo Neo Xe & Lưu Cont Qua Đêm
        const overnightBadge = document.getElementById('detail-overnight-badge');
        const detentionBadgeStatus = document.getElementById('detail-detention-badge-status');
        const detentionInfoText = document.getElementById('detail-detention-info-text');
        const gateoutSummary = document.getElementById('detail-gateout-summary');

        if (gateoutSummary) gateoutSummary.innerText = trip.actual_gate_out_time && trip.actual_gate_out_time !== '-' ? trip.actual_gate_out_time : 'chưa xác nhận';

        if (trip.is_overnight_detention || (trip.dropoff_appointment_time && trip.dropoff_appointment_time.toLowerCase().includes('00:00'))) {
            if (overnightBadge) overnightBadge.classList.remove('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-black text-[10.5px] bg-amber-200 text-amber-950 uppercase border border-amber-300';
                detentionBadgeStatus.innerText = `Lưu Xe Qua Đêm (${trip.overnight_wait_hours || 'Chờ sau 0h'})`;
            }
            if (detentionInfoText) {
                const feeCustStr = trip.detention_fee_customer > 0 ? `Thu KH: ${new Intl.NumberFormat('vi-VN').format(trip.detention_fee_customer)} đ` : 'Chưa định giá';
                const allowDrvStr = trip.detention_driver_allowance > 0 ? `Chi TX: ${new Intl.NumberFormat('vi-VN').format(trip.detention_driver_allowance)} đ` : 'Chưa tính phụ cấp';
                detentionInfoText.innerHTML = `Lý do: <strong>${trip.detention_reason || 'Kho yêu cầu chờ sau 0h mới hạ bãi'}</strong>. Mốc hẹn: <strong class="text-amber-950 font-mono">${trip.dropoff_appointment_time}</strong>. Đã hạch toán: <strong class="text-teal-900">${feeCustStr}</strong> | <strong class="text-indigo-900">${allowDrvStr}</strong>.`;
            }
        } else {
            if (overnightBadge) overnightBadge.classList.add('hidden');
            if (detentionBadgeStatus) {
                detentionBadgeStatus.className = 'px-2 py-0.2 rounded font-bold text-[10.5px] bg-slate-100 text-slate-700';
                detentionBadgeStatus.innerText = 'Bình thường';
            }
            if (detentionInfoText) {
                detentionInfoText.innerHTML = `Xe kéo cont ra khỏi kho lúc <strong>${trip.actual_gate_out_time || '-'}</strong>. Nếu kho yêu cầu chờ sau 0h mới hạ bãi, vui lòng bấm cập nhật để tự động tính phụ phí.`;
            }
        }

        // Lịch đóng hàng & Cắt máng
        const loadSchedEl = document.getElementById('detail-loading-schedule');
        if (loadSchedEl) loadSchedEl.innerText = `${trip.loading_date} (Giờ: ${trip.loading_time || '08:00'})`;
        const cutoffEl = document.getElementById('detail-cutoff');
        if (cutoffEl) cutoffEl.innerText = trip.cutoff || '-';
        const notesEl = document.getElementById('detail-cargo-notes');
        if (notesEl) notesEl.innerText = trip.cargo_notes || 'Không có lưu ý đặc biệt';

        // Hành trình 3 điểm
        setText('detail-pickup', trip.pickup);
        setText('detail-warehouse', trip.warehouse);
        setText('detail-dropoff', trip.dropoff || 'Hạ bãi rỗng');

        // Link Zalo và Màn hình Tài xế Mobile
        const driverToken = trip.driver_hashid || trip.hashid || trip.trip_code;
        const driverPortalUrl = `${window.location.origin}/driver/${driverToken}/`;
        const driverPortalBtn = document.getElementById('driver-portal-btn');
        if (driverPortalBtn) {
            driverPortalBtn.href = driverPortalUrl;
        }

        const zaloLink = document.getElementById('zalo-driver-link');
        if (zaloLink) {
            zaloLink.href = trip.driver_phone ? `https://zalo.me/${trip.driver_phone}` : '#';
        }

        // Status Badge
        const statusCls = STATUS_STYLE_MAP[trip.status] || 'bg-slate-100 text-slate-700 border-slate-300';
        const badge = document.getElementById('detail-status-badge');
        if (badge) {
            badge.className = `px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading ${statusCls}`;
            badge.innerText = trip.status_label || trip.status_display || STATUS_NAME_MAP[trip.status] || trip.status || 'Chưa xác định';
        }

        // Cập nhật Cảnh báo SLA & Từ chối Chuyến Xe
        const slaBanner = document.getElementById('trip-sla-warning-banner');
        if (slaBanner) {
            if (trip.acceptance_sla_status === 'DECLINED' || trip.declined_at) {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-100 border-rose-400 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `❌ TÀI XẾ ${trip.driver} ĐÃ TỪ CHỐI CHUYẾN!`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerHTML = `Lý do từ chối: <strong class="text-rose-900">${escapeHtml(trip.decline_reason || 'Không nêu lý do')}</strong> (${trip.minutes_since_dispatch} phút trước). Vui lòng phân lại tài xế / xe khác ngay để đảm bảo tiến độ!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'OVERDUE') {
                slaBanner.className = 'p-4 rounded-2xl border bg-rose-50 border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `⚠️ CẢNH BÁO: TÀI XẾ QUÁ HẠN XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Bác tài ${trip.driver} (${trip.driver_phone || 'Chưa có SĐT'}) chưa nhận chuyến sau hơn 60 phút phát lệnh. Vui lòng gọi điện xác nhận hoặc phân xe/tài xế khác ngay!`;
                slaBanner.classList.remove('hidden');
            } else if (trip.status === 'DISPATCHED' && trip.acceptance_sla_status === 'WARNING') {
                slaBanner.className = 'p-4 rounded-2xl border bg-amber-50 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all mb-4';
                const iconBox = document.getElementById('trip-sla-icon-box');
                if (iconBox) iconBox.className = 'w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center text-2xl shrink-0';
                const titleEl = document.getElementById('trip-sla-title');
                if (titleEl) titleEl.innerText = `ĐANG CHỜ BÁC TÀI XÁC NHẬN (${trip.minutes_since_dispatch} PHÚT)`;
                const descEl = document.getElementById('trip-sla-desc');
                if (descEl) descEl.innerText = `Lệnh điều xe đã gửi tới bác tài ${trip.driver}. Hệ thống sẽ cảnh báo đỏ nếu quá 60 phút không phản hồi.`;
                slaBanner.classList.remove('hidden');
            } else {
                slaBanner.classList.add('hidden');
            }
        }

        // Trạng thái Chốt Sổ Kế Toán (Settlement Controls)
        const settleCont = document.getElementById('settlement-status-container');
        const btnAddTbl = document.getElementById('btn-add-expense-table');
        const banner = document.getElementById('cost-sheet-settled-banner');

        if (trip.is_expenses_settled) {
            if (settleCont) {
                settleCont.innerHTML = `
                    <span class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 flex items-center shadow-2xs font-heading" title="Chốt bởi ${trip.settled_by || 'Kế toán'} lúc ${trip.settled_at}">
                        <i class="ph-bold ph-lock-key mr-1.5 text-purple-600 text-sm"></i> Đã Chốt Sổ (Kế Toán)
                    </span>
                `;
            }
            if (btnAddTbl) btnAddTbl.classList.add('hidden');
            if (banner) {
                banner.classList.remove('hidden');
                const desc = document.getElementById('cost-sheet-settled-desc');
                if (desc) desc.innerText = `Chốt bởi ${trip.settled_by || 'Kế toán viên'} vào lúc ${trip.settled_at || 'gần đây'}. Dữ liệu chi phí đã khóa cứng đối soát.`;
            }
        } else {
            if (settleCont) {
                settleCont.innerHTML = '';
            }
            if (btnAddTbl) btnAddTbl.classList.remove('hidden');
            if (banner) banner.classList.add('hidden');
        }

        // P&L Summary Cards
        const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
        if (document.getElementById('pnl-revenue')) document.getElementById('pnl-revenue').innerText = formatMoney(trip.financials.revenue);
        if (document.getElementById('pnl-expense')) document.getElementById('pnl-expense').innerText = formatMoney(trip.financials.expense);
        if (document.getElementById('pnl-profit')) {
            const profitEl = document.getElementById('pnl-profit');
            profitEl.innerText = `${formatMoney(trip.financials.profit)} (${trip.financials.margin_percent}%)`;
        }

        // --- RENDER BẢNG KÊ CHI PHÍ (8 MỤC CHUẨN TRIỀN VÕ) ---
        renderCostSheetTable(trip);

        // --- RENDER MOBILE SIMULATOR DATA ---
        renderDriverMobileApp(trip);

        // --- RENDER TIẾN ĐỘ THỰC HIỆN (QUY TRÌNH 10 BƯỚC) DẠNG LƯỚI BẢNG CHUẨN ---
        const tContainer = document.getElementById('detail-timeline');
        if (tContainer) {
            const timelineList = trip.timeline || [];
            if (timelineList.length === 0) {
                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = `
                        <tr>
                            <td colspan="4" class="py-8 text-center text-slate-400 text-xs italic">
                                <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                                Đang khởi tạo các mốc tiến độ điều vận...
                            </td>
                        </tr>
                    `;
                } else {
                    tContainer.innerHTML = `
                        <div class="py-8 text-center text-slate-400 text-xs italic">
                            <i class="ph ph-clock-counter-clockwise text-2xl text-slate-300 block mb-1"></i>
                            Đang khởi tạo các mốc tiến độ điều vận...
                        </div>
                    `;
                }
            } else {
                let rowsHtml = '';
                timelineList.forEach(item => {
                    let rowClass = 'hover:bg-slate-50/60 transition-colors opacity-60';
                    let iconHtml = `<div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-[11px] font-normal mx-auto">${item.step}</div>`;
                    let textClass = 'text-slate-400 font-normal text-[13px]';
                    let actorTextClass = 'text-slate-400 font-normal text-[13px]';
                    let actorDisplay = '—';
                    let badgeHtml = '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-normal text-slate-400 bg-slate-100 border border-slate-200">Chưa thực hiện</span>';
                    
                    if (item.active) {
                        rowClass = 'bg-teal-50/40 hover:bg-teal-50/70 transition-colors border-l-4 border-l-teal-600';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-teal-600 text-white ring-4 ring-teal-100 flex items-center justify-center font-bold text-xs animate-pulse mx-auto"><div class="w-2 h-2 rounded-full bg-white"></div></div>';
                        textClass = 'text-teal-950 font-bold text-[13.5px]';
                        actorTextClass = 'text-teal-900 font-bold text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap animate-pulse">ĐANG THỰC HIỆN</span>';
                    } else if (item.done) {
                        rowClass = 'hover:bg-slate-50/80 transition-colors';
                        iconHtml = '<div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs mx-auto"><i class="ph-bold ph-check text-xs"></i></div>';
                        textClass = 'text-slate-800 font-medium text-[13px]';
                        actorTextClass = 'text-slate-700 font-medium text-[13px]';
                        actorDisplay = (item.actor && item.actor !== '—') ? item.actor : '—';
                        badgeHtml = '<span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">Hoàn thành</span>';
                    }

                    // Chứng từ đính kèm (Chỉ hiển thị khi có chứng từ thật đính kèm)
                    let docsHtml = '';
                    if (item.docs && item.docs.length > 0) {
                        const validDocs = item.docs.filter(doc => (typeof doc === 'object' && doc.url && doc.url.trim() !== ''));
                        if (validDocs.length > 0) {
                            const formattedDocs = validDocs.map(doc => {
                                const docName = doc.name || 'Chứng từ';
                                const docUrl = doc.url;
                                return `<a href="${docUrl}" target="_blank" rel="noopener noreferrer" class="text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2 inline-flex items-center gap-0.5 transition-colors" title="Bấm xem tài liệu / ảnh gốc"><i class="ph ph-file-text text-xs text-teal-600"></i><span>${docName}</span><i class="ph-bold ph-arrow-square-out text-[9px] text-teal-500"></i></a>`;
                            }).join('<span class="text-slate-300 mx-1.5 font-normal">;</span>');
                            docsHtml = formattedDocs;
                        }
                    }

                    rowsHtml += `
                        <tr class="${rowClass}">
                            <td class="py-3 px-3 text-center align-top">
                                ${iconHtml}
                            </td>
                            <td class="py-3 px-3 align-top">
                                <div class="${textClass} leading-snug">${item.title}</div>
                                ${item.time ? `
                                    <div class="text-[11px] mt-0.5 font-mono ${item.active ? 'text-teal-800 font-bold' : (item.done ? 'text-slate-500 font-medium' : 'text-slate-400')} flex items-center gap-1">
                                        <i class="ph ph-clock text-xs ${item.active ? 'text-teal-600' : 'text-slate-400'}"></i>
                                        <span>${item.time}</span>
                                    </div>
                                ` : ''}
                                ${docsHtml ? `
                                    <div class="text-[11.5px] mt-1.5 text-slate-600 leading-relaxed bg-slate-50/80 px-2 py-1 rounded-md border border-slate-200/60 inline-block">
                                        <span class="text-slate-400 font-medium mr-1"><i class="ph ph-paperclip mr-0.5 text-slate-400"></i>Chứng từ:</span>
                                        ${docsHtml}
                                    </div>
                                ` : ''}
                            </td>
                            <td class="py-3 px-3 text-center align-top whitespace-nowrap">
                                ${badgeHtml}
                            </td>
                            <td class="py-3 px-3 align-top whitespace-nowrap">
                                <span class="${actorTextClass}">${actorDisplay}</span>
                            </td>
                        </tr>
                    `;
                });

                if (tContainer.tagName === 'TBODY') {
                    tContainer.innerHTML = rowsHtml;
                } else {
                    tContainer.innerHTML = `
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-y border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-heading">
                                    <th class="py-2.5 px-3 w-14 text-center">Bước</th>
                                    <th class="py-2.5 px-3 min-w-[260px]">Nội Dung & Chứng Từ Đính Kèm</th>
                                    <th class="py-2.5 px-3 w-36 text-center">Trạng Thái</th>
                                    <th class="py-2.5 px-3 min-w-[170px]">Bộ Phận / Người Xử Lý</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs font-sans">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    `;
                }
            }
        }

        // --- RENDER DANH SÁCH CHỨNG TỪ GỐC & HÓA ĐƠN ĐIỆN TỬ ---
        const docContainer = document.getElementById('detail-documents');
        if (docContainer) {
            docContainer.innerHTML = '';
            const docList = trip.documents || [];
            if (docList.length === 0) {
                docContainer.innerHTML = `
                    <div class="py-4 text-center text-slate-400 text-xs italic md:col-span-2">
                        <i class="ph ph-file-dashed text-xl text-slate-300 block mb-1"></i>
                        Chưa có chứng từ đính kèm cho chuyến xe này.
                    </div>
                `;
            } else {
                docList.forEach(doc => {
                    // Xác định icon, màu sắc và danh mục chứng từ
                    let iconClass = 'ph-bold ph-file-text text-teal-600';
                    let iconBg = 'bg-teal-50 border-teal-200';
                    let tagLabel = doc.type_label || 'Chứng từ';

                    if (doc.type === 'BOOKING_NOTE') {
                        iconClass = 'ph-bold ph-file-pdf text-rose-600';
                        iconBg = 'bg-rose-50 border-rose-200';
                        tagLabel = 'Lệnh Booking / Cấp Rỗng';
                    } else if (doc.type === 'EIR_PICKUP') {
                        iconClass = 'ph-bold ph-truck text-blue-600';
                        iconBg = 'bg-blue-50 border-blue-200';
                        tagLabel = 'Phiếu EIR Lấy Cont';
                    } else if (doc.type === 'EIR_DROPOFF') {
                        iconClass = 'ph-bold ph-arrow-down-left text-indigo-600';
                        iconBg = 'bg-indigo-50 border-indigo-200';
                        tagLabel = 'Phiếu EIR Hạ Cont';
                    } else if (doc.type === 'POD') {
                        iconClass = 'ph-bold ph-signature text-emerald-600';
                        iconBg = 'bg-emerald-50 border-emerald-200';
                        tagLabel = 'Biên bản POD';
                    } else if (doc.type === 'INVOICE') {
                        iconClass = 'ph-bold ph-receipt text-amber-600';
                        iconBg = 'bg-amber-50 border-amber-200';
                        tagLabel = 'Hóa đơn / Biên nhận';
                    } else if (doc.type === 'WEIGHT_TICKET') {
                        iconClass = 'ph-bold ph-scales text-purple-600';
                        iconBg = 'bg-purple-50 border-purple-200';
                        tagLabel = 'Phiếu cân';
                    } else if (doc.type === 'CONTAINER_CHECK') {
                        iconClass = 'ph-bold ph-shield-check text-cyan-600';
                        iconBg = 'bg-cyan-50 border-cyan-200';
                        tagLabel = 'Giám định vỏ cont';
                    }

                    docContainer.innerHTML += `
                        <div class="flex items-center p-3 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-all shadow-2xs">
                            <div class="w-10 h-10 rounded-lg ${iconBg} border flex items-center justify-center mr-3 shrink-0">
                                <i class="${iconClass} text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0 pr-2">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                    <span class="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-heading">${tagLabel}</span>
                                    <p class="text-[13px] font-bold text-slate-900 truncate" title="${doc.name}">${doc.name}</p>
                                </div>
                                <p class="text-[11px] font-medium text-slate-600 truncate mt-0.5">${doc.details}</p>
                                <p class="text-[10px] text-slate-400 mt-0.5 flex items-center font-mono">
                                    <i class="ph ph-clock mr-1 text-[10px]"></i>${doc.time}
                                </p>
                            </div>
                            <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                                <span class="text-[10px] px-2 py-0.5 ${doc.is_verified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'} border rounded-md font-bold font-heading">
                                    ${doc.is_verified ? 'Đã Nghiệm Thu' : 'Chờ Đối Chiếu'}
                                </span>
                                ${doc.file_url ? `
                                    <a href="${doc.file_url}" target="_blank" rel="noopener noreferrer" 
                                       class="px-2 py-0.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 flex items-center gap-1 transition-colors" title="Xem / Tải chứng từ">
                                        <i class="ph-bold ph-eye"></i> Xem
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }

    } catch (err) {
        console.error('Error fetching trip detail:', err);
        showToast('danger', err.message || 'Không thể mở chi tiết chuyến xe.', 'Lỗi');
    }
}

// Hàm render Bảng Kê Chi Phí 8 Mục chuẩn theo 5 ảnh thực tế của Triền Võ
function renderCostSheetTable(trip) {
    const tbody = document.getElementById('cost-sheet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' đ';

    const costItems = [
        {
            stt: 1,
            title: 'HĐ điện tử',
            key: 'fee_einvoice',
            sub: 'Thông tin hóa đơn điện tử Cảng / Depot tra cứu',
            getVal: (t) => {
                const invExpenses = (t.expenses || []).filter(e => e.invoice_number);
                if (invExpenses.length === 0) return { text: 'Chưa có HĐĐT', hasInv: false };
                return {
                    text: invExpenses.map(e => `Số HĐ: ${e.invoice_number} (Mã: ${e.invoice_lookup_code || 'N/A'})`).join('; '),
                    hasInv: true,
                    lookup_url: invExpenses[0].invoice_lookup_url
                };
            }
        },
        { stt: 2, title: 'Nâng', code: 'LIFT_ON', key: 'fee_lift_on' },
        { stt: 3, title: 'Hạ', code: 'LIFT_OFF', key: 'fee_lift_off' },
        { stt: 4, title: 'Cược cont', code: 'CONTAINER_DEPOSIT', key: 'fee_deposit' },
        { stt: 5, title: 'Cân xe', code: 'WEIGHING', key: 'fee_weighing' },
        { stt: 6, title: 'Bốc xếp', code: 'LABOR_STEVEDORING', key: 'fee_labor' },
        { stt: 7, title: 'Vé cầu đường', code: 'TOLL_FEE', key: 'fee_toll' },
        { stt: 8, title: 'Chi phí khác', code: 'OTHER', key: 'fee_other' },
    ];

    let totalCalculated = 0;

    function renderExpenseDriverLegBadge(exp, t) {
        if (!exp) return '<span class="text-slate-300 text-xs">-</span>';
        const leg = exp.trip_leg || 'ENTIRE';
        if (leg === 'LEG_1') {
            const dName = exp.driver_name || t.driver || 'Tài xế 1';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Xe 1';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                        <i class="ph-bold ph-arrow-circle-right text-teal-700 mr-1"></i>Chặng 1
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'LEG_2') {
            const dName = exp.driver_name || t.dropoff_driver || 'Tài xế 2';
            const vPlate = exp.vehicle_plate || t.dropoff_vehicle || 'Xe 2';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 shrink-0">
                        <i class="ph-bold ph-arrow-circle-down text-indigo-700 mr-1"></i>Chặng 2
                    </span>
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        } else if (leg === 'COMPANY') {
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <i class="ph ph-buildings mr-1 text-slate-500"></i>Công ty chi chung
                </span>
            `;
        } else {
            const dName = exp.driver_name || t.driver || 'Tài xế';
            const vPlate = exp.vehicle_plate || t.vehicle || 'Đầu kéo';
            return `
                <div class="flex items-center space-x-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 text-[12px]">${dName}</span>
                    <span class="text-[11px] text-slate-500 font-mono">(${vPlate})</span>
                </div>
            `;
        }
    }

    costItems.forEach(item => {
        if (item.key === 'fee_einvoice') {
            const einvInfo = item.getVal(trip);
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70">
                        <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        <p class="text-[11.5px] text-slate-400 mt-0.5">${item.sub}</p>
                    </td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70 text-slate-400 text-xs italic">
                        Cảng / Depot
                    </td>
                    <td class="py-1.5 px-3 text-right text-slate-400 font-medium border-r border-slate-200/70">-</td>
                    <td class="py-1.5 px-3 border-r border-slate-200/70" colspan="2">
                        ${einvInfo.hasInv ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-[11.5px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    ${einvInfo.text}
                                </span>
                                ${einvInfo.lookup_url ? `
                                    <a href="${einvInfo.lookup_url}" target="_blank" class="text-[11.5px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                                        <i class="ph ph-arrow-square-out mr-1"></i> Tra cứu online
                                    </a>
                                ` : ''}
                            </div>
                        ` : `
                            <span class="text-[11.5px] text-slate-400 italic">Chưa phát sinh hóa đơn</span>
                        `}
                    </td>
                    <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                        ${einvInfo.hasInv 
                            ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800">Đã Liên Kết</span>`
                            : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-500">Trống</span>`}
                    </td>
                    <td class="py-1.5 px-3 text-center text-slate-300">-</td>
                </tr>
            `;
        } else {
            // Lấy các bản ghi expense khớp với category này
            const matchedExps = (trip.expenses || []).filter(e => {
                if (item.code === 'LIFT_ON') return e.category_code === 'LIFT_ON' || e.category_code === 'LIFT_ON_OFF';
                if (item.code === 'LIFT_OFF') return e.category_code === 'LIFT_OFF';
                if (item.code === 'TOLL_FEE') return e.category_code === 'TOLL_FEE' || e.category_code === 'BOT_TOLL';
                if (item.code === 'CONTAINER_DEPOSIT') return e.category_code === 'CONTAINER_DEPOSIT';
                if (item.code === 'WEIGHING') return e.category_code === 'WEIGHING';
                if (item.code === 'LABOR_STEVEDORING') return e.category_code === 'LABOR_STEVEDORING' || e.category_code === 'STEVEDORING';
                if (item.code === 'OTHER') return e.category_code === 'OTHER' || e.category_code === 'PORT_STORAGE' || e.category_code === 'REPAIR_TIRE';
                return false;
            });

            const amountSum = matchedExps.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalCalculated += amountSum;

            if (matchedExps.length > 1) {
                // TRƯỜNG HỢP CÓ TỪ 2 KHOẢN CHI TRỞ LÊN: HỖ TRỢ BẤM VÀO ĐỂ XỔ XUỐNG XEM CHI TIẾT TỪNG DÒNG
                const summaryInvText = matchedExps.map(e => e.invoice_number ? e.invoice_number : '').filter(Boolean).join(', ');
                const hasLeg1 = matchedExps.some(e => e.trip_leg === 'LEG_1');
                const hasLeg2 = matchedExps.some(e => e.trip_leg === 'LEG_2');
                const legSummaryBadge = (hasLeg1 && hasLeg2)
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300"><i class="ph-bold ph-arrows-split mr-1 text-amber-700"></i>Chặng 1 & 2</span>`
                    : (hasLeg1 ? `<span class="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Chặng 1</span>` : (hasLeg2 ? `<span class="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Chặng 2</span>` : `<span class="text-xs font-bold text-slate-700">${trip.driver || '-'}</span>`));
                
                tbody.innerHTML += `
                    <!-- DÒNG TỔNG GỘP (Clickable Accordion) -->
                    <tr onclick="toggleExpenseDetail('${item.code}')" class="hover:bg-teal-50/50 cursor-pointer transition-colors bg-slate-50/40 border-b border-slate-200/80">
                        <td class="py-2 px-3 text-center text-teal-800 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                                <span class="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 text-[10.5px] font-bold font-heading hover:bg-teal-200 transition-colors">
                                    <i class="ph-bold ph-list-numbers"></i>
                                    <span>${matchedExps.length} khoản chi</span>
                                    <i id="icon-toggle-${item.code}" class="ph ph-caret-down text-xs transition-transform duration-200"></i>
                                </span>
                            </div>
                            <p class="text-[11.5px] text-teal-700 font-semibold mt-0.5 flex items-center">
                                <i class="ph ph-hand-pointing mr-1"></i> Bấm để xem/ẩn chi tiết từng vé (${matchedExps.length} dòng con)
                            </p>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            ${legSummaryBadge}
                        </td>
                        <td class="py-2 px-3 text-right font-black text-[13px] tabular-nums text-rose-600 font-mono border-r border-slate-200/70">
                            <span class="border-b-2 border-dotted border-rose-400 pb-0.5" title="Tổng cộng ${matchedExps.length} khoản">
                                ${formatMoney(amountSum)}
                            </span>
                        </td>
                        <td class="py-2 px-3 border-r border-slate-200/70">
                            <span class="text-[11.5px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                ${summaryInvText ? `Gồm các HĐ: ${summaryInvText}` : `Tổng hợp ${matchedExps.length} chứng từ`}
                            </span>
                        </td>
                        <td class="py-2 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <span class="text-teal-800 font-semibold">Xem chi tiết các khoản bên dưới</span>
                        </td>
                        <td class="py-2 px-3 text-center border-r border-slate-200/70">
                            <button type="button" class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center space-x-1 shadow-sm font-heading">
                                <span>Chi tiết</span>
                                <i class="ph ph-caret-down text-xs"></i>
                            </button>
                        </td>
                        <td class="py-2 px-3 text-center text-slate-400 text-[11px] font-semibold">
                            Tập hợp
                        </td>
                    </tr>

                    <!-- CÁC DÒNG CON CHI TIẾT (Sub-rows) -->
                    ${matchedExps.map((subExp, sIdx) => `
                        <tr class="sub-row-${item.code} hidden bg-teal-50/30 border-l-4 border-l-teal-600 border-b border-slate-100 transition-all text-xs">
                            <td class="py-1.5 px-2.5 text-center text-teal-800 font-mono font-bold text-[11.5px] border-r border-slate-200/70">${item.stt}.${sIdx + 1}</td>
                            <td class="py-1.5 px-2.5 pl-6 border-r border-slate-200/70">
                                <div class="flex items-center space-x-2">
                                    <i class="ph ph-arrow-elbow-down-right text-teal-700 font-black text-sm"></i>
                                    <span class="font-bold text-slate-900 text-[12.5px]">${subExp.notes || (item.title + ' #' + (sIdx + 1))}</span>
                                </div>
                                ${subExp.time ? `<p class="text-[11px] text-slate-400 pl-5 font-normal mt-0.5">${subExp.time}</p>` : ''}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${renderExpenseDriverLegBadge(subExp, trip)}
                            </td>
                            <td class="py-1.5 px-2.5 text-right font-black text-rose-600 tabular-nums font-mono text-[13px] border-r border-slate-200/70">
                                ${formatMoney(subExp.amount)}
                            </td>
                            <td class="py-1.5 px-2.5 border-r border-slate-200/70">
                                ${subExp.invoice_number ? `
                                    <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                                        <span>HĐ: ${subExp.invoice_number}${subExp.invoice_lookup_code ? ' / ' + subExp.invoice_lookup_code : ''}</span>
                                        ${subExp.invoice_lookup_url ? `
                                            <a href="${subExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                                <i class="ph ph-arrow-square-out text-xs"></i>
                                            </a>
                                        ` : ''}
                                    </div>
                                ` : '<span class="text-slate-400 text-[11.5px]">Vé trạm / Biên nhận</span>'}
                            </td>
                            <td class="py-1.5 px-2.5 text-slate-700 text-[11.5px] font-medium border-r border-slate-200/70">
                                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span>${subExp.invoice_issuer || subExp.notes || '<span class="text-slate-400">-</span>'}</span>
                                    ${subExp.is_on_behalf_of_customer ? `
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                            <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                        </span>
                                    ` : ''}
                                </div>
                            </td>
                            <td class="py-1.5 px-2.5 text-center border-r border-slate-200/70">
                                <span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    subExp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                    subExp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }">
                                    ${subExp.status_label || (subExp.status === 'SETTLED' ? 'Đã chốt sổ' : (subExp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                                </span>
                            </td>
                            <td class="py-1.5 px-2.5 text-center">
                                ${trip.is_expenses_settled || !subExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="event.stopPropagation(); editExpensePrompt(${subExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="event.stopPropagation(); deleteExpensePrompt(${subExp.id}, '${subExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `}
                            </td>
                        </tr>
                    `).join('')}
                `;
            } else {
                // TRƯỜNG HỢP CÓ 0 HOẶC 1 KHOẢN CHI: HIỂN THỊ DÒNG ĐƠN BÌNH THƯỜNG
                const singleExp = matchedExps[0] || null;
                const invNoText = singleExp && singleExp.invoice_number 
                    ? `HĐ: ${singleExp.invoice_number}${singleExp.invoice_lookup_code ? ' / ' + singleExp.invoice_lookup_code : ''}` 
                    : '';
                const issuerText = singleExp ? (singleExp.invoice_issuer || singleExp.notes) : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 ${amountSum > 0 ? 'bg-amber-50/20' : ''}">
                        <td class="py-1.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200/70">${item.stt}</td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            <span class="font-bold text-slate-900 text-[13px]">${item.title}</span>
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${singleExp ? renderExpenseDriverLegBadge(singleExp, trip) : '<span class="text-slate-300 text-xs">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-right font-black text-[13px] tabular-nums font-mono border-r border-slate-200/70 ${amountSum > 0 ? 'text-rose-600' : 'text-slate-400'}">
                            ${amountSum > 0 ? formatMoney(amountSum) : '-'}
                        </td>
                        <td class="py-1.5 px-3 border-r border-slate-200/70">
                            ${invNoText ? `
                                <div class="inline-flex items-center space-x-1 font-mono text-[11.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <span>${invNoText}</span>
                                    ${singleExp.invoice_lookup_url ? `
                                        <a href="${singleExp.invoice_lookup_url}" target="_blank" class="text-blue-600 hover:text-blue-800 ml-1 font-bold" title="Tra cứu online">
                                            <i class="ph ph-arrow-square-out text-xs"></i>
                                        </a>
                                    ` : ''}
                                </div>
                            ` : '<span class="text-slate-400 text-[11.5px]">-</span>'}
                        </td>
                        <td class="py-1.5 px-3 text-slate-600 text-[11.5px] border-r border-slate-200/70">
                            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span>${issuerText || '<span class="text-slate-400">-</span>'}</span>
                                ${(singleExp && singleExp.is_on_behalf_of_customer) ? `
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                                        <i class="ph-bold ph-arrow-up-right mr-0.5 text-[10px]"></i>CHI HỘ KH
                                    </span>
                                ` : ''}
                            </div>
                        </td>
                        <td class="py-1.5 px-3 text-center border-r border-slate-200/70">
                            ${amountSum > 0 
                                ? `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold ${
                                    (singleExp && singleExp.status === 'SETTLED') ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }">${(singleExp && singleExp.status_label) || 'Đã Ghi Nhận'}</span>` 
                                : `<span class="px-2 py-0.2 rounded text-[10.5px] font-bold bg-slate-100 text-slate-400">-</span>`}
                        </td>
                        <td class="py-1.5 px-3 text-center">
                            ${singleExp ? (
                                trip.is_expenses_settled || !singleExp.can_edit ? `
                                    <span class="inline-flex items-center text-purple-700 font-bold text-[10.5px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title="Đã chốt sổ Kế toán, không thể chỉnh sửa">
                                        <i class="ph-bold ph-lock mr-1"></i> Khóa
                                    </span>
                                ` : `
                                    <div class="inline-flex items-center space-x-1">
                                        <button type="button" onclick="editExpensePrompt(${singleExp.id})" class="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors font-bold" title="Chỉnh sửa chi phí">
                                            <i class="ph ph-pencil text-sm"></i>
                                        </button>
                                        <button type="button" onclick="deleteExpensePrompt(${singleExp.id}, '${singleExp.category_name}')" class="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors font-bold" title="Xóa khoản chi">
                                            <i class="ph ph-trash text-sm"></i>
                                        </button>
                                    </div>
                                `
                            ) : '<span class="text-slate-300">-</span>'}
                        </td>
                    </tr>
                `;
            }
        }
    });

    const totalEl = document.getElementById('cost-sheet-total');
    if (totalEl) totalEl.innerText = formatMoney(totalCalculated);

    // Hiển thị dòng Tổng Chi Hộ KH nếu có (cất riêng khỏi chi phí vận hành)
    const reimbursableTotal = trip.cost_sheet?.total_reimbursable || 0;
    const reimbursableItems = trip.cost_sheet?.reimbursable_items || [];
    const reimbursableRow = document.getElementById('cost-sheet-reimbursable-row');
    const reimbursableTotalEl = document.getElementById('cost-sheet-reimbursable-total');
    if (reimbursableRow) {
        reimbursableRow.style.display = reimbursableTotal > 0 ? '' : 'none';
    }
    if (reimbursableTotalEl) {
        const itemsText = reimbursableItems.map(it => `${it.category}: ${formatMoney(it.amount)}`).join(' · ');
        reimbursableTotalEl.innerHTML = `
            <td colspan="2" class="p-3 text-right text-xs font-bold text-amber-800">
                <i class="ph-bold ph-arrow-up-right mr-1"></i>Tổng Khoản Chi Hộ Khách Hàng
                <p class="text-[10px] font-normal text-amber-600 mt-0.5">${itemsText || 'Công ty ứng chi trước, thu lại khi quyết toán với KH'}</p>
            </td>
            <td class="p-3 text-right font-black text-amber-700 tabular-nums">${formatMoney(reimbursableTotal)}</td>
            <td colspan="4" class="p-3 text-xs text-amber-600">
                <span class="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-800 text-[10px]">Không tính vào chi phí công ty</span>
            </td>
        `;
    }

    // ĐỒNG BỘ TUYỆT ĐỐI VỚI BOX P&L VÀ APP MOBILE (SINGLE SOURCE OF TRUTH)
    const pnlExpenseEl = document.getElementById('pnl-expense');
    if (pnlExpenseEl) pnlExpenseEl.innerText = formatMoney(totalCalculated);

    const rev = Number(trip.financials?.revenue || 0);
    const actualProfit = rev - totalCalculated;
    const actualMargin = rev > 0 ? ((actualProfit / rev) * 100).toFixed(1) : 0;
    const profitEl = document.getElementById('pnl-profit');
    if (profitEl) {
        profitEl.innerText = `${formatMoney(actualProfit)} (${actualMargin}%)`;
    }

    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalCalculated);
}

// Xây dựng nội dung tin nhắn Lệnh điều xe gửi Zalo chuẩn hóa
function buildDriverZaloMessage(trip) {
    if (!trip) return '';
    const driverToken = trip.driver_hashid || trip.hashid || trip.id || trip.trip_code;
    const portalUrl = `${window.location.origin}/driver/${driverToken}/`;
    const tripCode = trip.id || trip.trip_code || trip.code || 'TVL-XXX';
    const vehicle = trip.vehicle || trip.truck || '-';
    const trailer = trip.trailer || '-';
    const cont = trip.container || trip.container_number || 'CHƯA CÓ CONT';
    const contType = trip.container_type ? ` (${trip.container_type})` : '';
    const seal = trip.seal || trip.seal_number || '-';
    const pickup = trip.pickup || trip.pickup_location || '-';
    const warehouse = trip.warehouse || trip.warehouse_location || '-';
    const dropoff = trip.dropoff || trip.dropoff_location || '-';
    const loadingTimeStr = trip.loading_time ? `\n⏰ Giờ hẹn đóng hàng: ${trip.loading_time}` : '';

    return `🚚 LỆNH ĐIỀU XE BIM LOGISTICS:
• Chuyến: ${tripCode}
• Xe: ${vehicle} | Mooc: ${trailer}
• Cont: ${cont}${contType} | Seal: ${seal}
• Điểm 1 (Lấy cont): ${pickup}
• Điểm 2 (Giao kho): ${warehouse}
• Điểm 3 (Hạ cont): ${dropoff}${loadingTimeStr}
⚠️ LƯU Ý: Vui lòng mở link bên dưới xác nhận nhận chuyến trong vòng 60 phút.

👉 Mở link mobile báo mốc & kê chi phí:
${portalUrl}`;
}
window.buildDriverZaloMessage = buildDriverZaloMessage;

// Sao chép Lệnh điều xe kèm link Mobile Driver Portal gửi tài xế qua Zalo/SMS
window.copyDriverPortalLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chi tiết chuyến xe để sao chép!');
        return;
    }
    const message = buildDriverZaloMessage(trip);
    const portalUrl = `${window.location.origin}/driver/${trip.driver_hashid || trip.hashid || trip.id}/`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép Lệnh điều xe kèm link Mobile Driver Portal vào bộ nhớ tạm!\nBạn có thể dán (Ctrl+V) ngay vào Zalo gửi cho tài xế.', 'Đã Sao Chép Lệnh Xe');
        }).catch(err => {
            prompt('Sao chép liên kết gửi tài xế:', portalUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi tài xế:', portalUrl);
    }
};

window.openZaloDriverChat = function() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const message = buildDriverZaloMessage(trip);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
    }
    const phone = trip.driver_phone ? String(trip.driver_phone).replace(/\D/g, '') : '';
    if (phone) {
        window.open(`https://zalo.me/${phone}`, '_blank');
        showToast('success', `Đã sao chép Lệnh điều xe vào bộ nhớ tạm & Mở Zalo tài xế (${phone})! Hãy dán (Ctrl+V) để gửi.`, 'Mở Zalo Thành Công');
    } else {
        showToast('warning', 'Tài xế chưa có số điện thoại đăng ký Zalo trong hồ sơ.', 'Thiếu SĐT Tài Xế');
    }
};

window.copyCustomerTrackingLink = function() {
    const trip = window.currentTripDetail;
    if (!trip) {
        alert('Chưa có thông tin chuyến xe để sao chép!');
        return;
    }
    const trackingToken = trip.tracking_hashid || trip.hashid || trip.trip_code;
    const trackingUrl = `${window.location.origin}/tracking/${trackingToken}/`;
    const destWarehouse = trip.delivery_warehouse || trip.warehouse || 'Kho Khách Hàng';
    const message = `THÔNG TIN TRA CỨU VẬN ĐƠN CONTAINER - BIM LOGISTICS:\nChuyến: ${trip.trip_code || trip.code || trip.id}\nContainer: ${trip.container || '-'} (${trip.container_type || '40HC'})\nSố Chì (Seal): ${trip.seal || 'Chưa bấm'}\nKho Giao Hàng: ${destWarehouse}\n- Quý khách có thể theo dõi tiến độ chuyến xe thời gian thực tại: ${trackingUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            showToast('success', '✓ Đã sao chép liên kết tra cứu tiến độ chuyến xe dành cho khách hàng!\nBạn có thể dán (Ctrl+V) gửi qua Zalo / Email cho chủ hàng.', 'Đã Sao Chép Tracking Link');
        }).catch(err => {
            prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
        });
    } else {
        prompt('Sao chép liên kết gửi khách hàng:', trackingUrl);
    }
};

// Hàm mở / đóng chi tiết các dòng chi phí con khi người dùng click
function toggleExpenseDetail(code) {
    const subRows = document.querySelectorAll(`.sub-row-${code}`);
    const icon = document.getElementById(`icon-toggle-${code}`);
    subRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}

// Đồng bộ dữ liệu hiện trường sang Mobile Driver Sync (Simulator Chuẩn BIM)
function renderDriverMobileApp(trip) {
    if (!trip) return;

    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    // 1. Header Simulator
    const appTripCode = document.getElementById('app-trip-code');
    if (appTripCode) appTripCode.innerText = trip.id || 'TVL-XXX';

    const appDriver = document.getElementById('app-driver-name');
    if (appDriver) appDriver.innerText = `Tài xế: ${trip.driver || 'Chưa gán'}`;

    const appPlate = document.getElementById('app-vehicle-plate');
    if (appPlate) appPlate.innerText = trip.vehicle || 'Chưa gán';

    const statusBadge = document.getElementById('app-status-badge');
    if (statusBadge) {
        statusBadge.innerText = trip.status_label || trip.status || 'MỚI';
        if (trip.status === 'COMPLETED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase';
        } else if (trip.status === 'DELIVERED') {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-teal-500 text-white uppercase';
        } else if (['IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY', 'CONTAINER_PICKED', 'ACCEPTED'].includes(trip.status)) {
            statusBadge.className = 'text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 uppercase';
        } else {
            statusBadge.className = 'text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white uppercase';
        }
    }

    // 2. Nút Vận Đơn & Container Summary
    const appCont = document.getElementById('app-cont-no');
    if (appCont) appCont.innerText = trip.container || 'Chưa gán';

    const appBooking = document.getElementById('app-booking-no');
    if (appBooking) appBooking.innerText = trip.booking_or_bill || trip.booking || '-';

    const appCustomsDot = document.getElementById('app-customs-dot');
    if (appCustomsDot) {
        if (trip.customs_declaration) {
            appCustomsDot.classList.remove('hidden');
        } else {
            appCustomsDot.classList.add('hidden');
        }
    }

    // 3. Lộ Trình 3 Điểm & 3 Nút Chỉ Đường Thông Minh
    const pLoc = trip.pickup_depot || trip.pickup || 'Cảng / Bãi lấy cont';
    const wLoc = trip.delivery_warehouse || trip.warehouse || 'Kho đóng/trả hàng';
    const dLoc = trip.dropoff_depot || trip.dropoff || 'Cảng / Bãi hạ cont';

    const leg1Name = document.getElementById('sim-leg1-name');
    if (leg1Name) leg1Name.innerText = pLoc;
    const leg2Name = document.getElementById('sim-leg2-name');
    if (leg2Name) leg2Name.innerText = wLoc;
    const leg3Name = document.getElementById('sim-leg3-name');
    if (leg3Name) leg3Name.innerText = dLoc;

    const leg2Time = document.getElementById('sim-leg2-time');
    if (leg2Time) {
        let tStr = '';
        if (trip.loading_time) tStr += `Hẹn: ${trip.loading_time}`;
        if (trip.warehouse_dock) tStr += (tStr ? ' | ' : '') + `Dock: ${trip.warehouse_dock}`;
        leg2Time.innerText = tStr;
    }

    const mapBase = 'https://www.google.com/maps/dir/?api=1&destination=';
    const map1 = document.getElementById('sim-leg1-map');
    if (map1) map1.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const map2 = document.getElementById('sim-leg2-map');
    if (map2) map2.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const map3 = document.getElementById('sim-leg3-map');
    if (map3) map3.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    // Modal Route Elements
    const mLeg1Name = document.getElementById('sim-modal-leg1-name');
    if (mLeg1Name) mLeg1Name.innerText = pLoc;
    const mLeg2Name = document.getElementById('sim-modal-leg2-name');
    if (mLeg2Name) mLeg2Name.innerText = wLoc;
    const mLeg3Name = document.getElementById('sim-modal-leg3-name');
    if (mLeg3Name) mLeg3Name.innerText = dLoc;

    const mLeg1Map = document.getElementById('sim-modal-leg1-map');
    if (mLeg1Map) mLeg1Map.href = `${mapBase}${encodeURIComponent(pLoc)}`;
    const mLeg2Map = document.getElementById('sim-modal-leg2-map');
    if (mLeg2Map) mLeg2Map.href = `${mapBase}${encodeURIComponent(wLoc)}`;
    const mLeg3Map = document.getElementById('sim-modal-leg3-map');
    if (mLeg3Map) mLeg3Map.href = `${mapBase}${encodeURIComponent(dLoc)}`;

    const st = trip.status || 'DRAFT';

    // Đang đến
    let curDest = pLoc || 'Bãi lấy cont';
    if (st === 'RETURNING_EMPTY') {
        curDest = dLoc || 'Bãi hạ cont';
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        curDest = wLoc || 'Kho đóng/trả hàng';
    } else if (st === 'COMPLETED') {
        curDest = 'Đã hoàn tất toàn tuyến';
    }
    const curDestEl = document.getElementById('sim-current-dest');
    if (curDestEl) curDestEl.innerText = `Đang đến: ${curDest}`;

    // Trạng thái Lộ trình 3 điểm (Style đồng bộ Driver Portal)
    const leg1Card = document.getElementById('sim-leg1-card') || document.getElementById('sim-modal-leg1-card');
    const leg1Icon = document.getElementById('sim-leg1-icon') || document.getElementById('sim-modal-leg1-icon');
    const leg1Badge = document.getElementById('sim-leg1-badge') || document.getElementById('sim-modal-leg1-badge');

    const leg2Card = document.getElementById('sim-leg2-card') || document.getElementById('sim-modal-leg2-card');
    const leg2Icon = document.getElementById('sim-leg2-icon') || document.getElementById('sim-modal-leg2-icon');
    const leg2Badge = document.getElementById('sim-leg2-badge') || document.getElementById('sim-modal-leg2-badge');

    const leg3Card = document.getElementById('sim-leg3-card') || document.getElementById('sim-modal-leg3-card');
    const leg3Icon = document.getElementById('sim-leg3-icon') || document.getElementById('sim-modal-leg3-icon');
    const leg3Badge = document.getElementById('sim-leg3-badge') || document.getElementById('sim-modal-leg3-badge');

    // Reset styles
    const setLegStyle = (card, icon, badge, mode, stepNum, titleText) => {
        if (!card) return;
        if (mode === 'DONE') {
            card.className = 'p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-300 text-emerald-950';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-emerald-700 text-white';
                icon.innerHTML = '<i class="ph-bold ph-check text-xs"></i>';
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[8.5px]">ĐÃ XONG</span>`;
            }
        } else if (mode === 'ACTIVE') {
            card.className = 'p-3 rounded-xl border-2 bg-teal-50 border-teal-600 text-teal-950 shadow-2xs';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-black text-xs mt-0.5 shrink-0 bg-teal-700 text-white ring-2 ring-teal-200';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 text-teal-800';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span><span class="px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[9px] font-black animate-pulse">⚡ ĐANG ĐẾN</span>`;
            }
        } else {
            // PENDING
            card.className = 'p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-400';
            if (icon) {
                icon.className = 'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 bg-slate-200 text-slate-500';
                icon.innerHTML = `${stepNum}`;
            }
            if (badge) {
                badge.className = 'text-[10.5px] font-bold uppercase tracking-wider text-slate-500';
                badge.innerHTML = `<span>Điểm ${stepNum}: ${titleText}</span>`;
            }
        }
    };

    if (st === 'COMPLETED') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'DONE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (st === 'RETURNING_EMPTY') {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'DONE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'ACTIVE', 3, 'Bãi Hạ Vỏ Cont');
    } else if (['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED'].includes(st)) {
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'DONE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'ACTIVE', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    } else {
        // DRAFT, DISPATCHED, ACCEPTED
        setLegStyle(leg1Card, leg1Icon, leg1Badge, 'ACTIVE', 1, 'Lấy Cont / Hàng');
        setLegStyle(leg2Card, leg2Icon, leg2Badge, 'PENDING', 2, 'Kho Đóng / Trả Hàng');
        setLegStyle(leg3Card, leg3Icon, leg3Badge, 'PENDING', 3, 'Bãi Hạ Vỏ Cont');
    }

    // 4. SMART NEXT-ACTION HERO CARD (Tương tác 1-chạm)
    const nextStepLabel = document.getElementById('sim-next-step-label');
    const nextActionTitle = document.getElementById('sim-next-action-title');
    const nextActionDesc = document.getElementById('sim-next-action-desc');
    const nextActionBtns = document.getElementById('sim-next-action-btns');

    if (nextActionBtns) {
        if (st === 'DRAFT' || st === 'DISPATCHED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 1-2/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Lệnh điều xe mới phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Tài xế bấm nhận chuyến để bắt đầu hoặc từ chối để điều độ phân xe lại.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('DECLINED_TRIP')" class="py-2.5 rounded-xl border border-rose-500/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 hover:bg-rose-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-x-circle"></i> Từ Chối
                    </button>
                    <button type="button" onclick="driverReportMilestone('ACCEPTED_TRIP')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Nhận Chuyến
                    </button>
                </div>
            `;
        } else if (st === 'ACCEPTED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 3/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đã nhận lệnh — Chuẩn bị xuất phát';
            if (nextActionDesc) nextActionDesc.innerText = 'Chụp ảnh giám định vỏ cont tại bãi lấy cont trước khi xuất phát.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-slate-500 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-800 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp Vỏ Cont
                    </button>
                    <button type="button" onclick="driverReportMilestone('DEPARTED')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-paper-plane-tilt"></i> Xuất Phát Đi
                    </button>
                </div>
            `;
        } else if (st === 'CONTAINER_PICKED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 4-5/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang trên đường đến kho khách hàng';
            if (nextActionDesc) nextActionDesc.innerText = 'Báo trước 30 phút cho thủ kho hoặc bấm Check-in ngay khi đến cổng kho.';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="driverReportMilestone('APPROACHING_WAREHOUSE')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950/50 active:scale-95 transition-all">
                        <i class="ph-bold ph-bell-ringing"></i> Báo Sắp Đến
                    </button>
                    <button type="button" onclick="driverReportMilestone('ARRIVED_WAREHOUSE')" class="py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-map-pin"></i> Đến Cổng Kho
                    </button>
                </div>
            `;
        } else if (st === 'IN_TRANSIT' || st === 'AT_WAREHOUSE') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 6/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Tại kho — Chờ gọi vào Dock';
            if (nextActionDesc) nextActionDesc.innerText = 'Khi xe lùi vào dock mở cửa cont, bấm bắt đầu dỡ/đóng hàng.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('START_UNLOADING')" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-package text-base"></i>
                    <span>BẮT ĐẦU ĐÓNG / DỠ HÀNG</span>
                </button>
            `;
        } else if (st === 'UNLOADING') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 7/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang đóng/dỡ hàng tại Dock';
            if (nextActionDesc) nextActionDesc.innerText = 'Sau khi xếp hàng xong, chụp biên bản giao nhận có chữ ký (POD).';
            nextActionBtns.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="openOcrApp('chung-tu')" class="py-2.5 rounded-xl border border-teal-400 text-teal-200 font-bold text-xs flex items-center justify-center gap-1 hover:bg-teal-950 active:scale-95 transition-all">
                        <i class="ph-bold ph-camera"></i> Chụp POD
                    </button>
                    <button type="button" onclick="driverReportMilestone('FINISHED_UNLOADING')" class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all">
                        <i class="ph-bold ph-check-circle"></i> Đóng Xong
                    </button>
                </div>
            `;
        } else if (st === 'DELIVERED') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 8/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Hoàn tất giao hàng — Ra khỏi cổng kho';
            if (nextActionDesc) nextActionDesc.innerText = 'Kéo cont rời kho để vận chuyển về bãi cảng hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DEPART_TO_DROPOFF')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-truck text-base"></i>
                    <span>KÉO CONT RỜI KHO — VỀ BÃI HẠ</span>
                </button>
            `;
        } else if (st === 'RETURNING_EMPTY') {
            if (nextStepLabel) nextStepLabel.innerText = 'Bước 9/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Đang vận chuyển về bãi hạ';
            if (nextActionDesc) nextActionDesc.innerText = 'Đến bãi hạ, cẩu cont xuống và nhận Phiếu EIR hạ cont.';
            nextActionBtns.innerHTML = `
                <button type="button" onclick="driverReportMilestone('DROPOFF_COMPLETED')" class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all">
                    <i class="ph-bold ph-anchor text-base"></i>
                    <span>ĐÃ HẠ CONT — LẤY PHIẾU EIR</span>
                </button>
            `;
        } else {
            // COMPLETED
            if (nextStepLabel) nextStepLabel.innerText = 'Hoàn Tất 10/10';
            if (nextActionTitle) nextActionTitle.innerText = 'Chuyến xe đã hoàn thành 100%';
            if (nextActionDesc) nextActionDesc.innerText = 'Toàn bộ chứng từ và chi phí đã chuyển cho Điều Độ và Kế Toán đối soát.';
            nextActionBtns.innerHTML = `
                <div class="py-2 px-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-center text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5">
                    <i class="ph-bold ph-check-fat text-emerald-400"></i>
                    <span>CHUYẾN XE ĐÃ HOÀN TẤT</span>
                </div>
            `;
        }
    }

    // 4.5. DYNAMICALLY RENDER & LOCK QUICK MILESTONES (ZERO JUMP & COMPLETED LOCK)
    renderSimQuickMilestones(trip.status, !!trip.is_overnight_detention);

    // 5. Accordion Timeline Mini List
    const timelineMiniList = document.getElementById('sim-timeline-mini-list');
    if (timelineMiniList) {
        timelineMiniList.innerHTML = '';
        const tList = trip.timeline || [];
        if (tList.length === 0) {
            timelineMiniList.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-1 italic">Chưa có mốc tiến độ</p>`;
        } else {
            tList.forEach(item => {
                let dotClass = 'bg-slate-300 text-slate-600';
                let textClass = 'text-slate-500';
                let timeClass = 'text-slate-400';
                let iconContent = item.step;

                if (item.active) {
                    dotClass = 'bg-teal-600 text-white ring-2 ring-teal-200 animate-pulse';
                    textClass = 'text-teal-950 font-bold';
                    timeClass = 'text-teal-700 font-bold';
                } else if (item.done) {
                    dotClass = 'bg-emerald-600 text-white';
                    textClass = 'text-slate-800 font-medium';
                    timeClass = 'text-slate-500';
                    iconContent = '✓';
                }

                timelineMiniList.innerHTML += `
                    <div class="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0 text-[10.5px]">
                        <div class="flex items-center gap-1.5 overflow-hidden">
                            <span class="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${dotClass}">${iconContent}</span>
                            <span class="truncate ${textClass}">${item.title}</span>
                        </div>
                        <span class="font-mono text-[10px] shrink-0 pl-1 ${timeClass}">${item.time || '—'}</span>
                    </div>
                `;
            });
        }
    }

    // 6. Accordion Chi Phí Đã Kê
    const totalDriverExpense = (trip.expenses || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const appTotal = document.getElementById('app-total-expense');
    if (appTotal) appTotal.innerText = formatMoney(totalDriverExpense);

    const listEl = document.getElementById('app-expenses-list');
    if (listEl) {
        listEl.innerHTML = '';
        if (!trip.expenses || trip.expenses.length === 0) {
            listEl.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-2 italic">Chưa có khoản chi phí nào</p>`;
        } else {
            trip.expenses.forEach(exp => {
                let actionButtons = '';
                if (exp.status === 'PENDING') {
                    actionButtons = `
                        <div class="flex items-center space-x-1 mt-1">
                            <button onclick="driverEditExpense(${exp.id})" class="px-1.5 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[9.5px] font-bold border border-amber-200 flex items-center">
                                <i class="ph ph-pencil mr-0.5"></i> Sửa
                            </button>
                            <button onclick="driverDeleteExpense(${exp.id})" class="px-1.5 py-0.2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[9.5px] font-bold border border-rose-200 flex items-center">
                                <i class="ph ph-trash mr-0.5"></i> Xóa
                            </button>
                        </div>
                    `;
                } else if (exp.status === 'SETTLED') {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-purple-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã chốt sổ
                        </span>
                    `;
                } else {
                    actionButtons = `
                        <span class="inline-flex items-center text-[9px] font-bold text-emerald-700 mt-1">
                            <i class="ph-bold ph-lock mr-0.5"></i> Đã duyệt
                        </span>
                    `;
                }

                listEl.innerHTML += `
                    <div class="p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col space-y-0.5">
                        <div class="flex justify-between items-start">
                            <div class="overflow-hidden">
                                <p class="text-[11px] font-bold text-slate-800 truncate">${exp.category_name}</p>
                                <p class="text-[9.5px] text-slate-400 font-mono truncate">${exp.invoice_number ? 'HĐ: ' + exp.invoice_number : (exp.notes || exp.time)}</p>
                            </div>
                            <span class="text-[11px] font-black text-rose-600 tabular-nums shrink-0 pl-1">${formatMoney(exp.amount)}</span>
                        </div>
                        <div class="flex justify-between items-center pt-0.5 border-t border-slate-200/50">
                            <span class="text-[8.5px] px-1.5 py-0.2 rounded font-bold ${
                                exp.status === 'SETTLED' ? 'bg-purple-100 text-purple-800' :
                                exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }">
                                ${exp.status_label || (exp.status === 'SETTLED' ? 'Đã chốt sổ' : (exp.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'))}
                            </span>
                            ${actionButtons}
                        </div>
                    </div>
                `;
            });
        }
    }
}

// Helper đổ dữ liệu Chặng / Tài xế / Đầu kéo vào dropdown chi phí (Hỗ trợ Tài xế đăng nhập & Admin văn phòng)
function populateExpenseLegOptions(selectElId, selectedVal = null) {
    const select = document.getElementById(selectElId);
    if (!select || !currentActiveTripData) return;

    const t = currentActiveTripData;
    let html = '';

    // Xác định thông tin người dùng đang đăng nhập
    const currentUser = window.CURRENT_USER || {};
    const isCurrentUserDriver = currentUser.role === 'DRIVER';
    const currentEmpId = currentUser.employee_id;

    // Xác định giá trị mặc định được chọn
    let targetVal = selectedVal;
    if (!targetVal) {
        if (isCurrentUserDriver && currentEmpId) {
            if (t.is_split_trip && t.dropoff_driver_id === currentEmpId) {
                targetVal = 'LEG_2';
            } else if (t.driver_id === currentEmpId) {
                targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
            } else {
                targetVal = `DRIVER_${currentEmpId}`;
            }
        } else {
            // Mặc định cho Admin / Điều phối văn phòng
            targetVal = t.is_split_trip ? 'LEG_1' : 'ENTIRE';
        }
    }

    // Nhóm 1: Chặng vận chuyển & Tài xế Chuyến xe
    html += `<optgroup label="Tài xế & Chặng theo Chuyến xe">`;
    if (t.is_split_trip) {
        const driver1 = t.driver || 'Tài xế Chặng 1';
        const veh1 = t.vehicle || 'Xe 1';
        const driver2 = t.dropoff_driver || 'Tài xế Chặng 2';
        const veh2 = t.dropoff_vehicle || 'Xe 2';

        html += `<option value="LEG_1" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'LEG_1' ? 'selected' : ''}>Chặng 1 (Lấy cont ➔ Kho): ${driver1} (${veh1})</option>`;
        html += `<option value="LEG_2" data-driver-id="${t.dropoff_driver_id || ''}" data-vehicle-id="${t.dropoff_vehicle_id || ''}" ${targetVal === 'LEG_2' ? 'selected' : ''}>Chặng 2 (Kho ➔ Hạ bãi): ${driver2} (${veh2})</option>`;
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' ? 'selected' : ''}>Toàn trình: ${driver1} (${veh1})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    } else {
        const driver = t.driver || 'Tài xế';
        const veh = t.vehicle || 'Đầu kéo';
        html += `<option value="ENTIRE" data-driver-id="${t.driver_id || ''}" data-vehicle-id="${t.vehicle_id || ''}" ${targetVal === 'ENTIRE' || targetVal === 'LEG_1' ? 'selected' : ''}>Toàn trình: ${driver} (${veh})</option>`;
        html += `<option value="COMPANY" ${targetVal === 'COMPANY' ? 'selected' : ''}>Công ty chi chung (Cược cont, nâng hạ chuyển khoản VP...)</option>`;
    }
    html += `</optgroup>`;

    // Nhóm 2: Chọn tài xế khác trong Đội xe (Admin / Điều phối văn phòng có thể chọn tài khác)
    if (t.available_drivers && t.available_drivers.length > 0) {
        html += `<optgroup label="Tất cả Tài xế Đội xe (Admin / Điều phối chọn)">`;
        t.available_drivers.forEach(d => {
            const val = `DRIVER_${d.id}`;
            const isSelected = (targetVal === val || targetVal === d.id);
            const vehPlate = d.vehicle ? ` - Xe: ${d.vehicle}` : '';
            html += `<option value="${val}" data-driver-id="${d.id}" data-vehicle-id="${d.vehicle_id || ''}" ${isSelected ? 'selected' : ''}>${d.name} [${d.code}]${vehPlate}</option>`;
        });
        html += `</optgroup>`;
    }

    select.innerHTML = html;
}

// --- QUẢN LÝ MỐC CHỜ HẠ CONT SAU 0H & TÍNH PHÍ LƯU XE ---
function openModalDetention() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const modal = document.getElementById('modal-detention');
    if (!modal) return;

    const gateoutEl = document.getElementById('detention-modal-gateout-time');
    if (gateoutEl) gateoutEl.innerText = t.actual_gate_out_time || t.loading_time || 'Chưa ghi nhận mốc ra cổng';

    const inpAppoint = document.getElementById('detention-inp-appointment');
    if (inpAppoint) inpAppoint.value = (t.dropoff_appointment_time && t.dropoff_appointment_time !== '-') ? t.dropoff_appointment_time : 'Sau 00:00';

    const inpActual = document.getElementById('detention-inp-actual');
    if (inpActual) inpActual.value = (t.actual_dropoff_time && t.actual_dropoff_time !== '-') ? t.actual_dropoff_time : '';

    const inpReason = document.getElementById('detention-inp-reason');
    if (inpReason && t.detention_reason) inpReason.value = t.detention_reason;

    const inpHours = document.getElementById('detention-inp-hours');
    if (inpHours) inpHours.value = t.overnight_wait_hours > 0 ? t.overnight_wait_hours : 8.0;

    const chkOvernight = document.getElementById('detention-chk-overnight');
    if (chkOvernight) chkOvernight.checked = t.is_overnight_detention || true;

    const inpFeeCust = document.getElementById('detention-inp-fee-customer');
    if (inpFeeCust) {
        inpFeeCust.value = t.detention_fee_customer > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_fee_customer) : '800.000';
    }

    const inpAllowDrv = document.getElementById('detention-inp-allowance-driver');
    if (inpAllowDrv) {
        inpAllowDrv.value = t.detention_driver_allowance > 0 ? new Intl.NumberFormat('vi-VN').format(t.detention_driver_allowance) : '250.000';
    }

    modal.classList.remove('hidden-view');
}

function closeModalDetention() {
    const modal = document.getElementById('modal-detention');
    if (modal) modal.classList.add('hidden-view');
}

function setQuickAppointment(val) {
    const inp = document.getElementById('detention-inp-appointment');
    if (inp) inp.value = val;
}

function setCurrentTimeToDropoff() {
    const inp = document.getElementById('detention-inp-actual');
    if (!inp) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    inp.value = timeStr;
}

async function submitDetentionUpdate() {
    if (!currentActiveTripData) return;
    const tripCode = currentActiveTripData.trip_code || currentActiveTripData.id;
    
    const appointmentTime = document.getElementById('detention-inp-appointment')?.value?.trim();
    const actualTime = document.getElementById('detention-inp-actual')?.value?.trim();
    const reason = document.getElementById('detention-inp-reason')?.value?.trim();
    const hours = parseFloat(document.getElementById('detention-inp-hours')?.value || 0);
    const isOvernight = document.getElementById('detention-chk-overnight')?.checked ?? true;
    
    const parseMoney = (id) => {
        const val = document.getElementById(id)?.value?.replace(/\./g, '').replace(/,/g, '').trim();
        return parseInt(val) || 0;
    };
    
    const feeCustomer = parseMoney('detention-inp-fee-customer');
    const allowanceDriver = parseMoney('detention-inp-allowance-driver');
    const autoCreateExpense = document.getElementById('detention-chk-auto-expense')?.checked ?? true;

    try {
        const res = await fetchWithAuth(`/api/trips/${tripCode}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                dropoff_appointment_time: appointmentTime,
                actual_dropoff_time: actualTime,
                detention_reason: reason,
                overnight_wait_hours: hours,
                is_overnight_detention: isOvernight,
                detention_fee_customer: feeCustomer,
                detention_driver_allowance: allowanceDriver,
                auto_create_driver_allowance: autoCreateExpense
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');

        closeModalDetention();
        showToast('success', 'Đã lưu mốc hẹn hạ sau 0h và tính phí lưu xe thành công!', 'Tiến Độ Hạ Cont');

        // Tải lại chi tiết chuyến xe
        if (typeof openTripDetail === 'function') {
            await openTripDetail(tripCode);
        }
    } catch (err) {
        showToast('danger', err.message || 'Lỗi khi cập nhật mốc lưu xe', 'Thất bại');
    }
}

// Xác nhận nhận chuyến thay tài xế (khi điều độ gọi điện thoại trực tiếp)
async function confirmTripManually() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    const confirmed = await showConfirmModal({
        title: 'Xác Nhận Nhận Chuyến',
        message: `Xác nhận bác tài ${trip.driver} ĐÃ NHẬN CHUYẾN ${trip.id} qua điện thoại?\n\nTrạng thái sẽ được chuyển sang ĐÃ NHẬN VIỆC (ACCEPTED).`,
        confirmText: 'Xác Nhận Nhận Chuyến',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-phone-call text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${trip.id}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'ACCEPTED_TRIP',
                notes: 'Điều độ viên xác nhận nhận chuyến thay tài xế qua điện thoại'
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', `Đã xác nhận nhận chuyến ${trip.id}!`, 'Xác Nhận Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.message || data.error || 'Không thể xác nhận chuyến');
        }
    } catch (err) {
        console.error('Error confirming trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.confirmTripManually = confirmTripManually;

// Modal Phân Lại Xe / Bác Tài (Khi Quá Hạn Xác Nhận)
function openReassignDriverModal() {
    const trip = window.currentTripDetail;
    if (!trip) return;
    
    const modal = document.getElementById('modal-reassign-driver');
    if (!modal) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    if (selectDrv && trip.available_drivers) {
        selectDrv.innerHTML = '<option value="">-- Chọn Bác Tài Mới Thay Thế --</option>' + 
            trip.available_drivers.map(d => `<option value="${d.id}" data-veh="${d.vehicle_id || ''}">${escapeHtml(d.name)} ${d.vehicle ? `(Xe: ${d.vehicle})` : ''}</option>`).join('');
    }
    
    const currInfo = document.getElementById('reassign-current-info');
    if (currInfo) {
        currInfo.innerText = `Chuyến: ${trip.id} | Bác tài hiện tại: ${trip.driver} (${trip.vehicle})`;
    }

    modal.classList.remove('hidden-view');
    modal.classList.remove('hidden');
}
window.openReassignDriverModal = openReassignDriverModal;

function closeReassignDriverModal() {
    const modal = document.getElementById('modal-reassign-driver');
    if (modal) {
        modal.classList.add('hidden-view');
        modal.classList.add('hidden');
    }
}
window.closeReassignDriverModal = closeReassignDriverModal;

async function submitReassignDriver(e) {
    e.preventDefault();
    const trip = window.currentTripDetail;
    if (!trip) return;

    const selectDrv = document.getElementById('reassign-driver-select');
    const driverId = selectDrv?.value;
    if (!driverId) {
        alert('Vui lòng chọn tài xế mới!');
        return;
    }

    const selectedOption = selectDrv.options[selectDrv.selectedIndex];
    const vehId = selectedOption?.getAttribute('data-veh');
    const reason = document.getElementById('reassign-reason')?.value || 'Tài xế cũ không phản hồi sau 60 phút';

    try {
        const payload = {
            driver_id: parseInt(driverId, 10),
            notes: `[ĐỔI TÀI XẾ] ${reason}`
        };
        if (vehId && vehId !== 'null' && vehId !== '') {
            payload.vehicle_id = parseInt(vehId, 10);
        }

        const res = await fetchWithAuth(`/api/trips/${trip.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeReassignDriverModal();
            showToast('success', `Đã phân công lại chuyến ${trip.id} cho tài xế mới!`, 'Phân Xe Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();

            // Tự động mở Zalo cho bác tài mới
            const newTrip = window.currentTripDetail;
            if (newTrip && newTrip.driver_phone) {
                const cleanPhone = String(newTrip.driver_phone).replace(/\D/g, '');
                const msg = buildDriverZaloMessage(newTrip);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(msg).catch(() => {});
                }
                showToast('success', `Đã sao chép Lệnh điều xe & Mở Zalo tài xế mới (${cleanPhone}). Hãy dán (Ctrl+V) để gửi!`, 'Mở Zalo Tài Xế Mới');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            }
        } else {
            showToast('danger', data.message || data.error || 'Lỗi khi phân lại tài xế');
        }
    } catch (err) {
        console.error('Error reassigning driver:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.submitReassignDriver = submitReassignDriver;

// =========================================================================
// PHÂN HỆ HIỆU CHỈNH LỆNH ĐIỀU ĐỘNG & HỦY CHUYẾN XE (TRIP CRUD)
// =========================================================================
async function openModalEditTrip(tripCode = null) {
    const code = tripCode || (window.currentTripDetail ? window.currentTripDetail.id : null);
    if (!code) {
        showToast('warning', 'Vui lòng chọn chuyến xe cần hiệu chỉnh!');
        return;
    }

    // Tải master data options nếu chưa có
    if (typeof loadMasterDataFormOptions === 'function') {
        await loadMasterDataFormOptions();
    }
    if (typeof populateMasterDataDropdowns === 'function') {
        populateMasterDataDropdowns();
    }

    // Đổ danh sách Khách hàng, Bác tài, Đầu kéo, Rơ-mooc vào Form Edit nếu có cache
    if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache) {
        const { customers, drivers, vehicles, trailers } = masterDataFormOptionsCache;
        
        const custSel = document.getElementById('edit-inp-customer');
        if (custSel && Array.isArray(customers)) {
            const curVal = custSel.value;
            custSel.innerHTML = '<option value="">-- Chọn Khách Hàng --</option>' +
                customers.map(c => `<option value="${c.id}">${escapeHtml(c.label || c.name)}</option>`).join('');
            if (curVal) custSel.value = curVal;
        }

        const drvSel = document.getElementById('edit-inp-driver');
        if (drvSel && Array.isArray(drivers)) {
            const curVal = drvSel.value;
            drvSel.innerHTML = '<option value="">-- Chọn Bác Tài --</option>' +
                drivers.map(d => `<option value="${d.id}">${escapeHtml(d.label || d.nickname || d.full_name)}</option>`).join('');
            if (curVal) drvSel.value = curVal;
        }

        const vehSel = document.getElementById('edit-inp-vehicle');
        if (vehSel && Array.isArray(vehicles)) {
            const curVal = vehSel.value;
            vehSel.innerHTML = '<option value="">-- Chọn Đầu Kéo --</option>' +
                vehicles.map(v => `<option value="${v.id}">${escapeHtml(v.label || v.plate)}</option>`).join('');
            if (curVal) vehSel.value = curVal;
        }

        const trlSel = document.getElementById('edit-inp-trailer');
        if (trlSel && Array.isArray(trailers)) {
            const curVal = trlSel.value;
            trlSel.innerHTML = '<option value="">-- Chọn Rơ-Moóc --</option>' +
                trailers.map(t => `<option value="${t.id}">${escapeHtml(t.label || t.plate)}</option>`).join('');
            if (curVal) trlSel.value = curVal;
        }
    }

    // Lấy thông tin chuyến xe
    let trip = window.currentTripDetail;
    if (!trip || trip.id !== code) {
        try {
            const res = await fetchWithAuth(`/api/trips/${code}/`);
            if (res.ok) {
                trip = await res.json();
                window.currentTripDetail = trip;
            }
        } catch (e) {
            console.error('Error fetching trip detail for edit:', e);
        }
    }

    if (!trip) {
        showToast('danger', 'Không tìm thấy dữ liệu chuyến xe');
        return;
    }

    // Gán dữ liệu lên form Edit
    const codeEl = document.getElementById('edit-modal-trip-code');
    if (codeEl) codeEl.innerText = trip.id || trip.trip_code;

    // Customer
    const custSel = document.getElementById('edit-inp-customer');
    if (custSel) {
        if (trip.customer_id) {
            custSel.value = trip.customer_id;
        } else if (trip.customer) {
            for (let i = 0; i < custSel.options.length; i++) {
                if (custSel.options[i].text.toLowerCase().includes(trip.customer.toLowerCase())) {
                    custSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Type & Container type
    const typeSel = document.getElementById('edit-inp-type');
    if (typeSel) typeSel.value = trip.type || 'Nhập';
    const contTypeSel = document.getElementById('edit-inp-cont-type');
    if (contTypeSel) contTypeSel.value = trip.container_type || '40HC';

    // Container, Seal, Booking, VGM
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val && val !== '-') ? val : '';
    };

    setVal('edit-inp-booking', trip.booking);
    setVal('edit-inp-cont', trip.container);
    setVal('edit-inp-seal', trip.seal);
    setVal('edit-inp-vgm', trip.vgm_weight);

    // 3 Điểm
    setVal('edit-inp-pickup', trip.pickup);
    setVal('edit-inp-warehouse', trip.warehouse);
    setVal('edit-inp-dropoff', trip.dropoff);

    // Lịch đóng hàng
    setVal('edit-inp-loading-date', trip.raw_loading_date || trip.loading_date_raw || (trip.loading_date && trip.loading_date.match(/^\d{4}-\d{2}-\d{2}$/) ? trip.loading_date : ''));
    setVal('edit-inp-loading-time', trip.loading_time);
    setVal('edit-inp-dock', trip.warehouse_dock);

    // Driver, Vehicle, Trailer
    const drvSel = document.getElementById('edit-inp-driver');
    if (drvSel) {
        if (trip.driver_id) drvSel.value = trip.driver_id;
        else if (trip.driver) {
            for (let i = 0; i < drvSel.options.length; i++) {
                if (drvSel.options[i].text.toLowerCase().includes(trip.driver.toLowerCase())) {
                    drvSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const vehSel = document.getElementById('edit-inp-vehicle');
    if (vehSel) {
        if (trip.vehicle_id) vehSel.value = trip.vehicle_id;
        else if (trip.vehicle) {
            for (let i = 0; i < vehSel.options.length; i++) {
                if (vehSel.options[i].text.toLowerCase().includes(trip.vehicle.toLowerCase())) {
                    vehSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    const trlSel = document.getElementById('edit-inp-trailer');
    if (trlSel && trip.trailer_id) trlSel.value = trip.trailer_id;

    // Phụ & Ghi chú
    setVal('edit-inp-invoice', trip.commercial_invoice);
    setVal('edit-inp-free-det', trip.det_free_days || 3);
    const locTypeSel = document.getElementById('edit-inp-location-type');
    if (locTypeSel) locTypeSel.value = trip.cont_location_type || 'BÃI TVL';
    setVal('edit-inp-notes', trip.cargo_notes);

    // Mở modal
    const modal = document.getElementById('modal-edit-trip');
    if (modal) {
        modal.classList.remove('hidden-view');
        modal.classList.remove('hidden');
    }
}
window.openModalEditTrip = openModalEditTrip;

async function submitEditTripForm() {
    const trip = window.currentTripDetail;
    if (!trip) {
        showToast('danger', 'Không tìm thấy thông tin chuyến xe để cập nhật');
        return;
    }

    const btnSave = document.getElementById('btn-save-edit-trip');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ph ph-spinner-gap animate-spin mr-1"></i> Đang lưu...';
    }

    const payload = {
        customer_id: document.getElementById('edit-inp-customer')?.value || null,
        transport_type: document.getElementById('edit-inp-type')?.value || 'Nhập',
        container_type: document.getElementById('edit-inp-cont-type')?.value || '40HC',
        booking_number: document.getElementById('edit-inp-booking')?.value?.trim() || '',
        container_number: document.getElementById('edit-inp-cont')?.value?.trim() || '',
        seal_number: document.getElementById('edit-inp-seal')?.value?.trim() || '',
        vgm_weight: document.getElementById('edit-inp-vgm')?.value?.trim() || '',
        pickup_location: document.getElementById('edit-inp-pickup')?.value?.trim() || '',
        warehouse_location: document.getElementById('edit-inp-warehouse')?.value?.trim() || '',
        dropoff_location: document.getElementById('edit-inp-dropoff')?.value?.trim() || '',
        loading_date: document.getElementById('edit-inp-loading-date')?.value || null,
        loading_time: document.getElementById('edit-inp-loading-time')?.value?.trim() || '',
        warehouse_dock: document.getElementById('edit-inp-dock')?.value?.trim() || '',
        driver_id: document.getElementById('edit-inp-driver')?.value || null,
        vehicle_id: document.getElementById('edit-inp-vehicle')?.value || null,
        trailer_id: document.getElementById('edit-inp-trailer')?.value || null,
        commercial_invoice: document.getElementById('edit-inp-invoice')?.value?.trim() || '',
        free_det_days: document.getElementById('edit-inp-free-det')?.value || 3,
        cont_location_type: document.getElementById('edit-inp-location-type')?.value || 'BÃI TVL',
        cargo_notes: document.getElementById('edit-inp-notes')?.value?.trim() || ''
    };

    try {
        const res = await fetchWithAuth(`/api/trips/${trip.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeModal('modal-edit-trip');
            showToast('success', `Đã cập nhật lệnh điều động ${trip.id} thành công!`, 'Lưu Thành Công');
            await viewTripDetail(trip.id);
            if (typeof loadTripsData === 'function') loadTripsData();
        } else {
            showToast('danger', data.error || data.message || 'Lỗi khi cập nhật chuyến xe');
        }
    } catch (err) {
        console.error('Error updating trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ph-bold ph-floppy-disk text-sm"></i> Lưu Thay Đổi';
        }
    }
}
window.submitEditTripForm = submitEditTripForm;

async function deleteOrCancelTrip(tripCode = null) {
    const code = tripCode || (window.currentTripDetail ? window.currentTripDetail.id : null);
    if (!code) {
        showToast('warning', 'Không tìm thấy chuyến xe cần xóa');
        return;
    }

    const reason = prompt(`XÁC NHẬN HỦY / XÓA CHUYẾN XE ${code}\n\nNhập lý do hủy chuyến (để lưu vết nhật ký điều độ):`, 'Điều độ hủy hoặc dời lịch');
    if (reason === null) return; // Người dùng bấm Hủy

    try {
        const res = await fetchWithAuth(`/api/trips/${code}/`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason.trim() || 'Điều độ viên hủy chuyến' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeModal('modal-edit-trip');
            showToast('success', data.message || `Đã hủy chuyến ${code} thành công!`, 'Hủy Chuyến Thành Công');
            if (typeof backToTrips === 'function') {
                backToTrips();
            }
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.error || data.message || 'Không thể hủy chuyến xe');
        }
    } catch (err) {
        console.error('Error deleting trip:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}
window.deleteOrCancelTrip = deleteOrCancelTrip;

// Các hàm Modal Thêm Chi Phí Phát Sinh
function openModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) {
        populateExpenseLegOptions('expense-leg-select');
        modal.classList.remove('hidden-view');
    }
}

/**
 * Toggle switch cho ô Chi hộ KH — dùng chung cho cả Add và Edit modal.
 * @param {string} checkboxId   - id của <input type="checkbox" class="sr-only">
 * @param {string} wrapId       - id của div container (background highlight)
 * @param {string} dotId        - id của nút tròn trượt
 * @param {string} trackId      - id của dải track background
 */
function toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (!cb) return;

    cb.checked = !cb.checked;
    const isOn = cb.checked;

    // Hiệu ứng track (background)
    if (track) {
        track.style.backgroundColor = isOn ? '#0f766e' : ''; // teal-700
        track.className = track.className.replace(/bg-\S+/, isOn ? 'bg-teal-700' : 'bg-slate-300');
    }
    // Hiệu ứng dot trượt
    if (dot) {
        dot.style.transform = isOn ? 'translateX(20px)' : 'translateX(0px)';
    }
    // Highlight vùng wrap khi bật
    if (wrap) {
        if (isOn) {
            wrap.classList.remove('bg-amber-50', 'border-amber-200');
            wrap.classList.add('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        } else {
            wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
            wrap.classList.add('bg-amber-50', 'border-amber-200');
        }
    }
}

/** Reset toggle về mặc định (OFF) */
function resetBehalfToggle(checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    const wrap = document.getElementById(wrapId);
    const dot = document.getElementById(dotId);
    const track = document.getElementById(trackId);
    if (cb) cb.checked = false;
    if (track) { track.style.backgroundColor = ''; track.className = track.className.replace(/bg-teal-700|bg-slate-300/, 'bg-slate-300'); }
    if (dot) dot.style.transform = 'translateX(0px)';
    if (wrap) {
        wrap.classList.remove('bg-teal-50', 'border-teal-400', 'ring-2', 'ring-teal-300');
        wrap.classList.add('bg-amber-50', 'border-amber-200');
    }
}

/** Đặt toggle sang ON (khi mở modal edit và giá trị là true) */
function setBehalfToggle(value, checkboxId, wrapId, dotId, trackId) {
    const cb = document.getElementById(checkboxId);
    if (!cb) return;
    if (cb.checked !== !!value) {
        // Chỉ gọi toggle nếu cần thay đổi trạng thái
        if (!!value) toggleBehalfCheckbox(checkboxId, wrapId, dotId, trackId);
    }
}

function closeModalAddExpense() {
    const modal = document.getElementById('modal-add-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-add-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('expense-on-behalf-checkbox', 'expense-behalf-toggle-wrap', 'expense-behalf-toggle-dot', 'expense-behalf-toggle-track');
}

async function submitAddExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const category = document.getElementById('expense-category-select').value;
    const legSelect = document.getElementById('expense-leg-select');
    const selectedOption = legSelect?.options[legSelect.selectedIndex];
    const legVal = selectedOption?.value || 'ENTIRE';

    let trip_leg = 'ENTIRE';
    let driver_id = null;
    let vehicle_id = null;

    if (legVal.startsWith('DRIVER_')) {
        driver_id = parseInt(legVal.replace('DRIVER_', ''), 10);
        const dataVehId = selectedOption?.getAttribute('data-vehicle-id');
        vehicle_id = dataVehId ? parseInt(dataVehId, 10) : null;
        trip_leg = 'ENTIRE';
    } else if (legVal === 'COMPANY') {
        trip_leg = 'COMPANY';
        driver_id = null;
        vehicle_id = null;
    } else {
        trip_leg = legVal; // 'LEG_1', 'LEG_2', 'ENTIRE'
        const rawDriverId = selectedOption?.getAttribute('data-driver-id');
        const rawVehId = selectedOption?.getAttribute('data-vehicle-id');
        driver_id = rawDriverId ? parseInt(rawDriverId, 10) : null;
        vehicle_id = rawVehId ? parseInt(rawVehId, 10) : null;
    }

    const amount = parseNumberVN(document.getElementById('expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('expense-on-behalf-checkbox')?.checked || false;

    const payload = {
        category,
        trip_leg,
        amount,
        invoice_number,
        invoice_lookup_code,
        invoice_issuer,
        invoice_lookup_url,
        notes,
        is_on_behalf_of_customer
    };
    if (driver_id) payload.driver_id = driver_id;
    if (vehicle_id) payload.vehicle_id = vehicle_id;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            closeModalAddExpense();
            const chiHoLabel = is_on_behalf_of_customer ? ' [Chi hộ KH]' : '';
            showToast('success', data.message + chiHoLabel, 'Ghi nhận chi phí thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi xảy ra');
        }
    } catch (err) {
        console.error('Error adding expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM HIỆU CHỈNH & XÓA KHOẢN CHI PHÍ (KHI CHƯA KHÓA SỔ) ---
function openModalEditExpense(exp) {
    const modal = document.getElementById('modal-edit-expense');
    if (!modal) return;
    
    document.getElementById('edit-expense-id').value = exp.id;
    document.getElementById('edit-expense-category-select').value = exp.category_code;
    
    const t = currentActiveTripData;
    let selectedLeg = exp.trip_leg || 'ENTIRE';
    if (exp.driver_id) {
        if (t && exp.driver_id === t.driver_id) {
            selectedLeg = t.is_split_trip ? (exp.trip_leg || 'LEG_1') : 'ENTIRE';
        } else if (t && t.is_split_trip && exp.driver_id === t.dropoff_driver_id) {
            selectedLeg = 'LEG_2';
        } else {
            selectedLeg = `DRIVER_${exp.driver_id}`;
        }
    }
    populateExpenseLegOptions('edit-expense-leg-select', selectedLeg);
    
    document.getElementById('edit-expense-amount-input').value = formatNumberVN(exp.amount);
    document.getElementById('edit-expense-inv-number').value = exp.invoice_number || '';
    document.getElementById('edit-expense-inv-lookup-code').value = exp.invoice_lookup_code || '';
    document.getElementById('edit-expense-inv-issuer').value = exp.invoice_issuer || '';
    document.getElementById('edit-expense-inv-lookup-url').value = exp.invoice_lookup_url || '';
    document.getElementById('edit-expense-notes-input').value = exp.notes || '';

    // Đồng bộ toggle Chi hộ KH với giá trị hiện tại của expense
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    if (exp.is_on_behalf_of_customer) {
        toggleBehalfCheckbox('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
    }

    initAllNumberInputs();
    modal.classList.remove('hidden-view');
}

function closeModalEditExpense() {
    const modal = document.getElementById('modal-edit-expense');
    if (modal) modal.classList.add('hidden-view');
    const form = document.getElementById('form-edit-expense');
    if (form) form.reset();
    // Reset toggle về OFF
    resetBehalfToggle('edit-expense-on-behalf-checkbox', 'edit-expense-behalf-toggle-wrap', 'edit-expense-behalf-toggle-dot', 'edit-expense-behalf-toggle-track');
}

function editExpensePrompt(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) {
        showToast('warning', 'Không tìm thấy thông tin khoản chi.');
        return;
    }
    if (currentActiveTripData.is_expenses_settled || !exp.can_edit) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể chỉnh sửa chi phí này.', 'Bảng kê đã khóa');
        return;
    }
    openModalEditExpense(exp);
}

async function submitEditExpense(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const expenseId = document.getElementById('edit-expense-id').value;
    const category = document.getElementById('edit-expense-category-select').value;
    const legSelect = document.getElementById('edit-expense-leg-select');
    const selectedOption = legSelect?.options[legSelect.selectedIndex];
    const legVal = selectedOption?.value || 'ENTIRE';

    let trip_leg = 'ENTIRE';
    let driver_id = null;
    let vehicle_id = null;

    if (legVal.startsWith('DRIVER_')) {
        driver_id = parseInt(legVal.replace('DRIVER_', ''), 10);
        const dataVehId = selectedOption?.getAttribute('data-vehicle-id');
        vehicle_id = dataVehId ? parseInt(dataVehId, 10) : null;
        trip_leg = 'ENTIRE';
    } else if (legVal === 'COMPANY') {
        trip_leg = 'COMPANY';
        driver_id = null;
        vehicle_id = null;
    } else {
        trip_leg = legVal; // 'LEG_1', 'LEG_2', 'ENTIRE'
        const rawDriverId = selectedOption?.getAttribute('data-driver-id');
        const rawVehId = selectedOption?.getAttribute('data-vehicle-id');
        driver_id = rawDriverId ? parseInt(rawDriverId, 10) : null;
        vehicle_id = rawVehId ? parseInt(rawVehId, 10) : null;
    }

    const amount = parseNumberVN(document.getElementById('edit-expense-amount-input').value) || 0;
    const invoice_number = document.getElementById('edit-expense-inv-number').value.trim();
    const invoice_lookup_code = document.getElementById('edit-expense-inv-lookup-code').value.trim();
    const invoice_issuer = document.getElementById('edit-expense-inv-issuer').value.trim();
    const invoice_lookup_url = document.getElementById('edit-expense-inv-lookup-url').value.trim();
    const notes = document.getElementById('edit-expense-notes-input').value.trim();
    const is_on_behalf_of_customer = document.getElementById('edit-expense-on-behalf-checkbox')?.checked || false;

    const payload = {
        category,
        trip_leg,
        amount,
        invoice_number,
        invoice_lookup_code,
        invoice_issuer,
        invoice_lookup_url,
        notes,
        is_on_behalf_of_customer,
        driver_id,
        vehicle_id
    };

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            closeModalEditExpense();
            showToast('success', data.message, 'Cập nhật thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể cập nhật khoản chi phí');
        }
    } catch (err) {
        console.error('Error updating expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function deleteExpensePrompt(expenseId, categoryName) {
    if (!currentActiveTripData) return;
    if (currentActiveTripData.is_expenses_settled) {
        showToast('warning', 'Chuyến xe đã được Kế toán chốt sổ, không thể xóa chi phí.', 'Bảng kê đã khóa');
        return;
    }

    const confirmDelete = await showConfirmModal({
        title: 'Xóa Khoản Chi Phí',
        message: `Bạn có chắc chắn muốn xóa khoản chi "${categoryName}" này khỏi bảng kê chuyến xe?\n\nThao tác sẽ được lưu vết kiểm toán (Soft-Delete).`,
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmDelete) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Đã xóa chi phí');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa khoản chi phí');
        }
    } catch (err) {
        console.error('Error deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi xóa');
    }
}

// --- CÁC HÀM KHÓA SỔ & MỞ SỔ KẾ TOÁN (SETTLEMENT LIFECYCLE) ---
async function settleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmSettle = await showConfirmModal({
        title: 'Chốt Sổ Kế Toán Chuyến Xe',
        message: `Xác nhận CHỐT SỔ KẾ TOÁN cho chuyến xe [${currentActiveTripCode}]?\n\n• Toàn bộ chi phí thực tế sẽ chuyển sang trạng thái "ĐÃ CHỐT SỔ" (SETTLED).\n• Bảng kê sẽ bị khóa cứng (Read-only), ngăn chặn sửa đổi/xóa.\n• Số liệu được khóa để đối soát P&L và xuất hóa đơn.`,
        confirmText: 'Chốt Khóa Sổ',
        cancelText: 'Huỷ bỏ',
        type: 'success',
        icon: 'ph-bold ph-seal-check text-2xl'
    });
    if (!confirmSettle) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/settle-expenses/`, {
            method: 'POST'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Khóa Sổ Kế Toán Thành Công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Có lỗi khi chốt sổ');
        }
    } catch (err) {
        console.error('Error settling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

async function unsettleTripExpenses() {
    if (!currentActiveTripCode) return;
    
    const confirmUnsettle = await showConfirmModal({
        title: 'Mở Khóa Sổ Kế Toán',
        message: `MỞ KHÓA SỔ KẾ TOÁN CHO CHUYẾN XE [${currentActiveTripCode}]?\n\nLưu ý: Chỉ thực hiện khi cần điều chỉnh số liệu phát sinh sai sót hoặc bổ sung hóa đơn hợp lệ.`,
        confirmText: 'Mở Khóa Sổ',
        cancelText: 'Huỷ bỏ',
        type: 'warning',
        icon: 'ph-bold ph-lock-open text-2xl'
    });
    if (!confirmUnsettle) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/unsettle-expenses/`, {
            method: 'POST'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('warning', data.message, 'Đã Mở Khóa Sổ Kế Toán');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể mở khóa');
        }
    } catch (err) {
        console.error('Error unsettling expenses:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- THAO TÁC CỦA TÀI XẾ TRÊN MOBILE SIMULATOR ---
function driverEditExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được Điều độ / Kế toán duyệt, không thể tự sửa. Vui lòng gọi Điều độ viên.', 'Không thể sửa');
        return;
    }
    openModalEditExpense(exp);
}

async function driverDeleteExpense(expenseId) {
    if (!currentActiveTripData || !currentActiveTripData.expenses) return;
    const exp = currentActiveTripData.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (exp.status !== 'PENDING') {
        showToast('warning', 'Khoản chi đã được duyệt, tài xế không thể tự xóa.', 'Đã duyệt');
        return;
    }

    const ok = await showConfirmModal({
        title: 'Hủy Khoản Chi Nhập Nhầm',
        message: `Tài xế xác nhận muốn xóa khoản chi: "${exp.category_name}" (${new Intl.NumberFormat('vi-VN').format(exp.amount)} đ) do nhập nhầm?`,
        confirmText: 'Xóa Khoản Chi',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!ok) return;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/${expenseId}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', 'Đã hủy khoản chi nhập nhầm', 'Tài xế xóa thành công');
            viewTripDetail(currentActiveTripCode);
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể xóa');
        }
    } catch (err) {
        console.error('Error driver deleting expense:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// Dynamic quick milestones renderer with strict state machine and mistake rollback logic
function renderSimQuickMilestones(tripStatus, isOvernight) {
    const grid = document.getElementById('sim-quick-milestones-grid');
    if (!grid) return;

    if (tripStatus === 'COMPLETED') {
        grid.innerHTML = `
            <div class="col-span-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1">
                <div class="text-[11px] font-black text-slate-700 flex items-center justify-center gap-1.5 font-heading">
                    <i class="ph-bold ph-lock-key text-teal-700"></i>
                    <span>Chuyến xe đã hoàn tất (Đã khóa)</span>
                </div>
                <p class="text-[9.5px] text-slate-500">Mọi mốc tiến độ đã hoàn thành và được chốt cố định.</p>
            </div>
        `;
        return;
    }

    // Step order mapping (0: DISPATCHED, 1: ACCEPTED, 2: CONTAINER_PICKED, 3: IN_TRANSIT, 4: AT_WAREHOUSE, 5: UNLOADING, 6: DELIVERED, 7: RETURNING_EMPTY, 8: COMPLETED)
    const stepOrder = {
        'DRAFT': 0, 'DISPATCHED': 0,
        'ACCEPTED': 1,
        'CONTAINER_PICKED': 2,
        'IN_TRANSIT': 3,
        'AT_WAREHOUSE': 4,
        'UNLOADING': 5,
        'DELIVERED': 6,
        'RETURNING_EMPTY': 7,
        'COMPLETED': 8
    };

    const currentStep = stepOrder[tripStatus] !== undefined ? stepOrder[tripStatus] : 0;

    const quickBtns = [
        {
            code: 'APPROACHING_WAREHOUSE',
            title: 'Sắp đến kho',
            desc: 'Báo trước 30p',
            icon: 'ph-bell-ringing',
            targetStep: 3,
            color: 'teal'
        },
        {
            code: 'ARRIVED_WAREHOUSE',
            title: 'Đến cổng kho',
            desc: 'Check-in kho',
            icon: 'ph-map-pin',
            targetStep: 4,
            color: 'blue'
        },
        {
            code: 'START_UNLOADING',
            title: 'Đang dỡ/đóng',
            desc: 'Bắt đầu hàng',
            icon: 'ph-package',
            targetStep: 5,
            color: 'amber'
        },
        {
            code: 'FINISHED_UNLOADING',
            title: 'Đóng xong',
            desc: 'Chuẩn bị hạ',
            icon: 'ph-check-circle',
            targetStep: 6,
            color: 'emerald'
        },
        {
            code: 'OVERNIGHT_WAIT',
            title: 'Chờ sau 0h',
            desc: isOvernight ? 'Đã báo lưu xe' : 'Kho yêu cầu',
            icon: 'ph-moon',
            targetStep: null,
            color: 'amber'
        },
        {
            code: 'DROPOFF_COMPLETED',
            title: 'Đã hạ cont',
            desc: 'Phiếu EIR',
            icon: 'ph-anchor',
            targetStep: 8,
            color: 'teal'
        }
    ];

    let html = '';
    quickBtns.forEach(btn => {
        let isEnabled = false;
        let btnBadge = '';
        let btnStyle = '';

        if (btn.code === 'OVERNIGHT_WAIT') {
            if (currentStep >= 4 && currentStep <= 7 && !isOvernight) {
                isEnabled = true;
                btnBadge = 'Sau 0h';
                btnStyle = 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 text-amber-900 active:scale-95 cursor-pointer';
            } else if (isOvernight) {
                isEnabled = false;
                btnBadge = '✓ Đã báo';
                btnStyle = 'bg-amber-100/70 border-amber-300 text-amber-900 opacity-60 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        } else {
            const target = btn.targetStep;
            const isNext = (target === currentStep + 1) || (currentStep === 2 && target === 4);
            const isPrev1 = (target === currentStep - 1) || (currentStep === 4 && target === 3) || (currentStep === 7 && target === 6);
            const isPast = target < currentStep && !isPrev1;

            if (isNext) {
                isEnabled = true;
                btnBadge = 'Tiếp theo';
                btnStyle = `bg-${btn.color}-50 hover:bg-${btn.color}-100 border-${btn.color}-500 text-${btn.color}-950 ring-2 ring-${btn.color}-200/60 font-bold active:scale-95 cursor-pointer shadow-2xs`;
            } else if (isPrev1) {
                isEnabled = true;
                btnBadge = '↩ Sửa lại nếu nhầm';
                btnStyle = 'bg-amber-50/80 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold active:scale-95 cursor-pointer';
            } else if (isPast || target === currentStep) {
                isEnabled = false;
                btnBadge = '✓ Đã qua';
                btnStyle = 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-45 cursor-not-allowed';
            } else {
                isEnabled = false;
                btnBadge = 'Chưa đến';
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-35 cursor-not-allowed';
            }
        }

        const disabledAttr = isEnabled ? '' : 'disabled';
        const clickHandler = isEnabled ? `onclick="driverReportMilestone('${btn.code}')"` : '';

        html += `
            <button type="button" ${disabledAttr} ${clickHandler}
                class="p-1.5 rounded-lg border text-left transition-all ${btnStyle}">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold flex items-center gap-1">
                        <i class="ph-bold ${btn.icon}"></i> ${btn.title}
                    </span>
                    <span class="text-[8px] font-semibold px-1 py-0.2 rounded ${isEnabled ? 'bg-white/80 border border-slate-200 text-slate-800' : 'text-slate-400'}">${btnBadge}</span>
                </div>
                <span class="text-[8.5px] opacity-75 block mt-0.5">${btn.desc}</span>
            </button>
        `;
    });

    grid.innerHTML = html;
}

// Tài xế báo nhanh mốc thời gian kho 1 chạm (Bước 6 SOP)
async function driverReportMilestone(milestoneCode) {
    if (!currentActiveTripCode) return;
    if (currentActiveTripData && currentActiveTripData.status === 'COMPLETED') {
        showToast('warning', 'Chuyến xe đã hoàn tất! Toàn bộ mốc thời gian đã được chốt và khóa cố định.');
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({ milestone: milestoneCode })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast('success', data.message, 'Cập nhật tiến độ');
            await viewTripDetail(currentActiveTripCode);
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.message || data.error || data.detail || 'Không thể cập nhật mốc');
        }
    } catch (err) {
        console.error('Error reporting milestone:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

// --- CÁC HÀM ĐIỀU KHIỂN GIAO DIỆN SIMULATOR TÀI XẾ ---
function openSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimRouteDetailsModal() {
    const modal = document.getElementById('modal-sim-route-details');
    if (modal) modal.classList.add('hidden-view');
}

function toggleSimTimelineAccordion() {
    const body = document.getElementById('sim-timeline-body');
    const caret = document.getElementById('sim-timeline-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function toggleSimExpenseAccordion() {
    const body = document.getElementById('sim-expense-body');
    const caret = document.getElementById('sim-expense-caret');
    if (!body) return;
    body.classList.toggle('hidden');
    if (caret) {
        caret.classList.toggle('rotate-180');
    }
}

function openSimTripDetailsModal() {
    if (!currentActiveTripData) return;
    const t = currentActiveTripData;
    const formatMoney = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';

    const modal = document.getElementById('modal-sim-trip-details');
    if (!modal) return;

    const setT = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = (val !== undefined && val !== null && val !== '') ? val : '-';
    };

    setT('sim-modal-trip-code', `Lệnh: ${t.id || 'TVL-XXX'}`);
    setT('sim-modal-cont-type', t.container_type || '40HC');
    setT('sim-modal-cont-no', t.container || 'Chưa gán');
    setT('sim-modal-seal-no', t.seal || '-');
    setT('sim-modal-booking', t.booking_or_bill || t.booking || '-');
    setT('sim-modal-shipping-line', t.shipping_line || '-');
    setT('sim-modal-customer', t.customer || '-');
    setT('sim-modal-dock', t.warehouse_dock || 'Chưa gán');
    setT('sim-modal-det', t.det_free_days ? `${t.det_free_days} ngày` : (t.dem_det_countdown || '-'));
    setT('sim-modal-customs', t.customs_declaration || 'Chưa có');
    setT('sim-modal-advance', formatMoney(t.driver_advance_amount || 0));

    modal.classList.remove('hidden-view');
}

function closeSimTripDetailsModal() {
    const modal = document.getElementById('modal-sim-trip-details');
    if (modal) modal.classList.add('hidden-view');
}

function openSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.remove('hidden-view');
}

function closeSimIncidentModal() {
    const modal = document.getElementById('modal-sim-incident');
    if (modal) modal.classList.add('hidden-view');
}

async function submitSimIncident(e) {
    e.preventDefault();
    if (!currentActiveTripCode) return;

    const incType = document.getElementById('sim-inc-type')?.value;
    const incDesc = document.getElementById('sim-inc-desc')?.value;

    try {
        const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/milestones/`, {
            method: 'POST',
            body: JSON.stringify({
                milestone: 'INCIDENT_REPORTED',
                notes: `[SỰ CỐ: ${incType}] ${incDesc}`
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeSimIncidentModal();
            showToast('warning', 'Đã ghi nhận cảnh báo sự cố khẩn cấp và gửi thông báo tới Điều Độ!', 'Báo Sự Cố Thành Công');
            await viewTripDetail(currentActiveTripCode);
            if (typeof loadTripsData === 'function') {
                loadTripsData();
            }
        } else {
            showToast('danger', data.message || data.error || 'Không thể gửi báo cáo sự cố');
        }
    } catch (err) {
        console.error('Error submitting incident:', err);
        showToast('danger', 'Lỗi kết nối máy chủ');
    }
}

function openSimContactModal(type) {
    if (type === 'consignee') {
        const cName = currentActiveTripData?.customer || 'Thủ kho / Người nhận';
        alert(`LIÊN HỆ GIAO NHẬN HÀNG:\n\n• Người nhận / Khách hàng: ${cName}\n• Hotline: 0908.123.456\n• Điểm đến: ${currentActiveTripData?.warehouse_location || currentActiveTripData?.warehouse || 'Kho nhận hàng'}`);
    } else {
        const dispName = currentActiveTripData?.dispatcher || 'Điều độ trực';
        alert(`HOTLINE ĐIỀU ĐỘ PHỤ TRÁCH:\n\n• Điều độ: ${dispName} (0908.123.456 - Trực 24/7)\n• Mã chuyến xe: ${currentActiveTripCode || 'TVL-XXX'}`);
    }
}

function backToTrips() {
    document.getElementById('view-trip-detail').classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'trip-detail') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}

function backToDispatch() {
    const createTripView = document.getElementById('view-create-trip');
    if (createTripView) createTripView.classList.add('hidden-view');
    if (previousActiveTab && previousActiveTab !== 'create-trip') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('dieu-van', true);
    }
}

async function openCreateTripPage(bookingId = null, updateHistory = true) {
    await loadMasterDataFormOptions();
    populateMasterDataDropdowns();

    const form = document.getElementById('form-create-trip');
    if (form) form.reset();

    clearBookingFileSelection();

    const chk = document.getElementById('chk-drop-hook');
    if (chk) {
        chk.checked = false;
        toggleDropHookMode(false);
    }
    const chkTwin = document.getElementById('chk-twin-cont');
    if (chkTwin) {
        chkTwin.checked = false;
        toggleTwinContMode(false);
    }

    initDefaultDatesForCreateTrip();
    onFreeDaysChange();

    await loadActiveBookingsForModal(bookingId);

    const inheritedBadge = document.getElementById('fullpage-trip-badge-inherited');
    if (inheritedBadge) {
        if (bookingId) {
            inheritedBadge.classList.remove('hidden');
        } else {
            inheritedBadge.classList.add('hidden');
        }
    }

    if (updateHistory && window.history && window.history.pushState) {
        const tripNewPath = bookingId ? `/dispatch/trips/new?booking_id=${bookingId}` : '/dispatch/trips/new';
        if (window.location.pathname !== '/dispatch/trips/new') {
            window.history.pushState({ view: 'create-trip', bookingId }, '', tripNewPath);
        }
    }

    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-create-trip') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const createTripView = document.getElementById('view-create-trip');
    if (createTripView) createTripView.classList.remove('hidden-view');

    const topbarTitleEl = document.getElementById('topbar-page-title');
    if (topbarTitleEl) {
        topbarTitleEl.innerText = 'Điều vận | Tạo Lệnh Điều Động';
    }

    initAllNumberInputs();
}

// --- XỬ LÝ ĐÍNH KÈM FILE BOOKING / LỆNH CẤP RỖNG (TRIP DISPATCH & SALE) ---
let currentInheritedBookingFile = null;
let tripBookingFilesList = [];
let saleBookingFilesList = [];
let saleBookingExistingDocs = [];
let currentEditingBookingId = null;

function setBookingTime(timeStr) {
    const el = document.getElementById('booking-loading-time');
    if (el) {
        el.value = timeStr;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function syncBookingClosingTime() {
    const d = document.getElementById('booking-closing-date')?.value;
    const t = document.getElementById('booking-closing-time-val')?.value || '17:00';
    const hidden = document.getElementById('booking-closing-time');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingClosingTime(timeStr) {
    const el = document.getElementById('booking-closing-time-val');
    if (el) el.value = timeStr;
    syncBookingClosingTime();
}

function syncBookingSiTime() {
    const d = document.getElementById('booking-si-date')?.value;
    const t = document.getElementById('booking-si-time-val')?.value || '12:00';
    const hidden = document.getElementById('booking-si-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setBookingSiTime(timeStr) {
    const el = document.getElementById('booking-si-time-val');
    if (el) el.value = timeStr;
    syncBookingSiTime();
}

function syncTripCutoff() {
    const d = document.getElementById('inp-cutoff-date')?.value;
    const t = document.getElementById('inp-cutoff-time')?.value || '17:00';
    const hidden = document.getElementById('inp-cutoff');
    if (hidden) {
        hidden.value = d ? `${d} ${t}` : '';
    }
}

function setTripCutoffTime(timeStr) {
    const el = document.getElementById('inp-cutoff-time');
    if (el) el.value = timeStr;
    syncTripCutoff();
}

function parseAndSetDateTimeFields(rawStr, dateInputId, timeInputId, hiddenInputId, defaultTime = '17:00') {
    const dateEl = document.getElementById(dateInputId);
    const timeEl = document.getElementById(timeInputId);
    const hiddenEl = document.getElementById(hiddenInputId);
    if (!rawStr || typeof rawStr !== 'string') {
        if (dateEl) dateEl.value = '';
        if (timeEl) timeEl.value = defaultTime;
        if (hiddenEl) hiddenEl.value = '';
        return;
    }
    const val = rawStr.trim();
    if (hiddenEl) hiddenEl.value = val;

    let foundDate = '';
    let foundTime = defaultTime;

    // Check ISO date YYYY-MM-DD
    const isoDateMatch = val.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
        foundDate = isoDateMatch[1];
    } else {
        // Check VN date DD/MM/YYYY or DD/MM
        const vnDateMatch = val.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
        if (vnDateMatch) {
            const day = String(vnDateMatch[1]).padStart(2, '0');
            const month = String(vnDateMatch[2]).padStart(2, '0');
            const year = vnDateMatch[3] ? vnDateMatch[3] : new Date().getFullYear();
            foundDate = `${year}-${month}-${day}`;
        }
    }

    // Check Time HH:MM or HHhMM or HHh
    const timeMatch = val.match(/\b(\d{1,2}):(\d{2})\b/);
    if (timeMatch) {
        const hh = String(timeMatch[1]).padStart(2, '0');
        const mm = String(timeMatch[2]).padStart(2, '0');
        foundTime = `${hh}:${mm}`;
    } else {
        const hourOnlyMatch = val.match(/\b(\d{1,2})h(?:(\d{2}))?\b/i);
        if (hourOnlyMatch) {
            const hh = String(hourOnlyMatch[1]).padStart(2, '0');
            const mm = hourOnlyMatch[2] ? String(hourOnlyMatch[2]).padStart(2, '0') : '00';
            foundTime = `${hh}:${mm}`;
        }
    }

    if (dateEl && foundDate) dateEl.value = foundDate;
    if (timeEl && foundTime) timeEl.value = foundTime;

    if (dateEl && dateEl.value && timeEl && timeEl.value) {
        if (hiddenEl) hiddenEl.value = `${dateEl.value} ${timeEl.value}`;
    }
}

// 1. Quản lý file đính kèm cho Lệnh điều động (Trip modal)
function handleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        // Tránh trùng tên & kích thước
        const isDuplicate = tripBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            tripBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderTripBookingFilesList();
}

function removeTripBookingFile(index) {
    if (index >= 0 && index < tripBookingFilesList.length) {
        tripBookingFilesList.splice(index, 1);
        renderTripBookingFilesList();
    }
}

function renderTripBookingFilesList() {
    const area = document.getElementById('booking-files-list-area');
    const summary = document.getElementById('booking-file-summary');
    if (!area) return;

    let itemsHtml = '';
    let totalCount = tripBookingFilesList.length;

    // Nếu có file kế thừa từ booking cha
    if (currentInheritedBookingFile && currentInheritedBookingFile.url) {
        totalCount += 1;
        const isPdf = currentInheritedBookingFile.url.toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${currentInheritedBookingFile.name || 'File Booking'}">${currentInheritedBookingFile.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 italic font-medium">(Kế thừa từ Booking)</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${currentInheritedBookingFile.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở xem file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    <button type="button" onclick="removeInheritedBookingFile()" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Gỡ bỏ file kế thừa">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    }

    tripBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-slate-400 font-medium">(${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeTripBookingFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa file">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    area.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm (hoặc kế thừa từ Booking)`;
        }
    }
}

function clearBookingFileSelection() {
    const input = document.getElementById('inp-booking-file');
    if (input) input.value = '';
    tripBookingFilesList = [];
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
}

function showInheritedBookingFile(fileUrl, fileName) {
    if (!fileUrl) {
        currentInheritedBookingFile = null;
    } else {
        currentInheritedBookingFile = { url: fileUrl, name: fileName || 'File_Booking_Dinh_Kem' };
    }
    renderTripBookingFilesList();
}

function removeInheritedBookingFile() {
    currentInheritedBookingFile = null;
    renderTripBookingFilesList();
    showToast('info', 'Đã gỡ bỏ file đính kèm kế thừa từ Booking.');
}

// 2. Quản lý multi-files cho Sale / Booking Order
function handleSaleBookingFilesSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > 5 * 1024 * 1024) {
            showToast('warning', `File "${file.name}" vượt quá 5MB. Vui lòng chọn file nhẹ hơn.`, 'File Quá Dung Lượng');
            continue;
        }
        const isDuplicate = saleBookingFilesList.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            saleBookingFilesList.push(file);
        }
    }
    input.value = '';
    renderSaleBookingFilesList();
}

function removeSaleBookingNewFile(index) {
    if (index >= 0 && index < saleBookingFilesList.length) {
        saleBookingFilesList.splice(index, 1);
        renderSaleBookingFilesList();
    }
}

async function deleteSaleBookingExistingDoc(docId) {
    if (!currentEditingBookingId || !docId) {
        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Xóa Tài Liệu Booking',
        message: 'Bạn có chắc chắn muốn xóa tài liệu này khỏi Booking không?\n\nThao tác sẽ gỡ bỏ tệp đính kèm khỏi hệ thống.',
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/bookings/${currentEditingBookingId}/documents/${docId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Lỗi khi xóa tài liệu');

        saleBookingExistingDocs = saleBookingExistingDocs.filter(d => d.id !== docId);
        renderSaleBookingFilesList();
        showToast('success', 'Đã xóa tài liệu đính kèm', 'Thành Công');
    } catch (err) {
        console.error('Lỗi xóa document:', err);
        showToast('error', err.message || 'Không thể xóa tài liệu đính kèm', 'Lỗi');
    }
}

function renderSaleBookingFilesList() {
    const listArea = document.getElementById('booking-order-files-list');
    const summary = document.getElementById('booking-order-files-summary');
    if (!listArea) return;

    let itemsHtml = '';
    const totalCount = saleBookingExistingDocs.length + saleBookingFilesList.length;

    // Render các file đã lưu trong CSDL
    saleBookingExistingDocs.forEach(doc => {
        const isPdf = (doc.name || doc.url || '').toLowerCase().endsWith('.pdf');
        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-teal-50 border border-teal-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-teal-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-teal-900 truncate" title="${doc.name || 'File Booking'}">${doc.name || 'File Booking'}</p>
                        <span class="text-[10px] text-teal-700 font-medium">${doc.size_formatted ? `(${doc.size_formatted})` : '(Đã lưu)'}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${doc.url}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-100 transition-colors" title="Mở file">
                        <i class="ph-bold ph-arrow-square-out text-sm"></i>
                    </a>
                    ${doc.id ? `
                        <button type="button" onclick="deleteSaleBookingExistingDoc(${doc.id})" 
                            class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Xóa tài liệu này">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    // Render các file mới chọn chưa lưu
    saleBookingFilesList.forEach((file, idx) => {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const sizeKb = (file.size / 1024).toFixed(0);
        const sizeStr = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
        const tempUrl = URL.createObjectURL(file);

        itemsHtml += `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-200 shadow-2xs text-xs">
                <div class="flex items-center space-x-2 truncate pr-2">
                    <i class="${isPdf ? 'ph-bold ph-file-pdf text-rose-600' : 'ph-bold ph-file-image text-blue-600'} text-base shrink-0"></i>
                    <div class="truncate">
                        <p class="font-bold text-slate-800 truncate" title="${file.name}">${file.name}</p>
                        <span class="text-[10px] text-blue-600 font-medium">Mới: (${sizeStr})</span>
                    </div>
                </div>
                <div class="flex items-center space-x-1 shrink-0">
                    <a href="${tempUrl}" target="_blank" rel="noopener noreferrer" 
                        class="p-1 rounded text-blue-700 hover:text-blue-900 hover:bg-blue-50 transition-colors" title="Xem trước">
                        <i class="ph-bold ph-eye text-sm"></i>
                    </a>
                    <button type="button" onclick="removeSaleBookingNewFile(${idx})" 
                        class="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors" title="Bỏ file này">
                        <i class="ph-bold ph-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listArea.innerHTML = itemsHtml;
    if (summary) {
        if (totalCount > 0) {
            summary.innerHTML = `<i class="ph-bold ph-check-circle text-emerald-600"></i> <strong class="text-emerald-800">${totalCount}</strong> tệp đính kèm`;
        } else {
            summary.innerHTML = `<i class="ph ph-info text-blue-500"></i> Chưa có tệp nào được đính kèm`;
        }
    }
}

function clearSaleBookingFileSelection() {
    const input = document.getElementById('booking-order-file');
    if (input) input.value = '';
    saleBookingFilesList = [];
    saleBookingExistingDocs = [];
    currentEditingBookingId = null;
    renderSaleBookingFilesList();
}

function showSaleExistingBookingFile(fileUrl, fileName, docs = []) {
    saleBookingFilesList = [];
    if (docs && docs.length > 0) {
        saleBookingExistingDocs = [...docs];
    } else if (fileUrl) {
        saleBookingExistingDocs = [{
            id: null,
            name: fileName || 'File_Booking_Dinh_Kem',
            url: fileUrl,
            size_formatted: ''
        }];
    } else {
        saleBookingExistingDocs = [];
    }
    renderSaleBookingFilesList();
}

// --- 4. TẠO LỆNH ĐIỀU ĐỘNG VỚI DEFENSIVE VALIDATION (Bim_ERP Standard) ---
async function submitNewTrip() {
    const is_split_trip = document.getElementById('chk-drop-hook')?.checked || false;

    // Reset lỗi cũ & cấu hình danh sách trường bắt buộc theo chế độ chạy
    const requiredFields = [
        { id: 'inp-customer', errId: 'err-customer', label: 'Khách hàng' },
        { id: 'inp-pickup', errId: 'err-pickup', label: 'Nơi lấy cont/hàng' },
        { id: 'inp-warehouse', errId: 'err-warehouse', label: 'Nơi đóng/trả hàng' }
    ];

    if (is_split_trip) {
        requiredFields.push({ id: 'inp-driver-leg1', errId: 'err-driver-leg1', label: 'Tài xế lấy cont (Chặng 1)' });
        requiredFields.push({ id: 'inp-dropoff-driver', errId: 'err-dropoff-driver', label: 'Tài xế hạ cont (Chặng 2)' });
    } else {
        requiredFields.push({ id: 'inp-driver', errId: 'err-driver', label: 'Tài xế nhận lệnh' });
    }

    let hasError = false;
    let firstErrorEl = null;
    const missingLabels = [];

    requiredFields.forEach(f => {
        const inputEl = document.getElementById(f.id);
        const errEl = document.getElementById(f.errId);
        if (!inputEl) return;
        
        if (!inputEl.value || !inputEl.value.trim()) {
            hasError = true;
            missingLabels.push(f.label);
            inputEl.classList.add('input-error');
            if (errEl) {
                errEl.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Vui lòng chọn/nhập ${f.label.toLowerCase()}`;
                errEl.classList.remove('hidden');
            }
            if (!firstErrorEl) firstErrorEl = inputEl;

            // Tự động xóa viền đỏ khi người dùng bắt đầu nhập hoặc chọn option
            const clearError = () => {
                inputEl.classList.remove('input-error');
                if (errEl) errEl.classList.add('hidden');
            };
            inputEl.addEventListener('input', clearError, { once: true });
            inputEl.addEventListener('change', clearError, { once: true });
        } else {
            inputEl.classList.remove('input-error');
            if (errEl) errEl.classList.add('hidden');
        }
    });

    if (hasError) {
        showToast('warning', `Vui lòng chọn/nhập các thông tin bắt buộc: ${missingLabels.join(', ')}`, 'Thiếu dữ liệu');
        if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                try { firstErrorEl.focus(); } catch (e) {}
            }, 250);
        }
        return;
    }

    const bookingOrderEl = document.getElementById('select-booking-order');
    const booking_order_id = bookingOrderEl && bookingOrderEl.value ? parseInt(bookingOrderEl.value) : null;
    const customer = document.getElementById('inp-customer')?.value || '';
    const type = document.getElementById('inp-type')?.value || 'Nhập';
    const is_twin_container = document.getElementById('chk-twin-cont')?.checked || false;
    let container_type = document.getElementById('inp-cont-type') ? document.getElementById('inp-cont-type').value : (is_twin_container ? '2x20DC' : '40HC');
    if (is_twin_container && (!container_type || container_type === '40HC')) {
        container_type = '2x20DC';
    }
    const container = document.getElementById('inp-cont')?.value || '';
    const booking = document.getElementById('inp-booking')?.value || '';
    const seal = document.getElementById('inp-seal')?.value || '';
    const vgm_weight = document.getElementById('inp-vgm')?.value || '';
    syncTripCutoff();
    const cutoff = document.getElementById('inp-cutoff')?.value || '';
    const commercial_invoice = document.getElementById('inp-invoice') ? document.getElementById('inp-invoice').value.trim() : '';
    const warehouse_dock = document.getElementById('inp-dock') ? document.getElementById('inp-dock').value.trim() : '';
    const loading_time = document.getElementById('inp-load-time') ? document.getElementById('inp-load-time').value.trim() : '08:00';
    const cont_location_type = document.getElementById('inp-cont-loc') ? document.getElementById('inp-cont-loc').value.trim() : 'NHÀ MÁY';

    // Trường Cont thứ 2 (Kẹp 20ft)
    const container_2 = is_twin_container ? (document.getElementById('inp-cont-2')?.value || '').trim() : '';
    const seal_2 = is_twin_container ? (document.getElementById('inp-seal-2')?.value || '').trim() : '';
    const booking_2 = is_twin_container ? (document.getElementById('inp-booking-2')?.value || '').trim() : '';
    const vgm_weight_2 = is_twin_container ? (document.getElementById('inp-vgm-2')?.value || '').trim() : '';
    const cargo_notes_2 = is_twin_container ? (document.getElementById('inp-cargo-notes-2')?.value || '').trim() : '';

    // Nghiệp vụ Cảng: Quản lý Hạn Free DEM/DET & Giám định EIR
    const det_free_days = parseInt(document.getElementById('inp-det-free-days')?.value) || 3;
    const dem_free_days = parseInt(document.getElementById('inp-dem-free-days')?.value) || 3;
    const det_expiry_date = document.getElementById('inp-det-expiry')?.value || '';
    const dem_expiry_date = document.getElementById('inp-dem-expiry')?.value || '';
    const container_condition = document.getElementById('select-container-condition')?.value || 'GOOD';
    const damage_description = (document.getElementById('inp-damage-desc')?.value || '').trim();

    const pickup = document.getElementById('inp-pickup')?.value || '';
    const warehouse = document.getElementById('inp-warehouse')?.value || '';
    const dropoff = document.getElementById('inp-dropoff')?.value || '';
    let driver = '';
    let vehicle = '';
    let dropoff_driver = '';
    let dropoff_vehicle = '';
    let driver_split_ratio = 50;

    if (is_split_trip) {
        driver = document.getElementById('inp-driver-leg1')?.value || '';
        vehicle = document.getElementById('inp-vehicle-leg1')?.value || '';
        dropoff_driver = document.getElementById('inp-dropoff-driver')?.value || '';
        dropoff_vehicle = document.getElementById('inp-dropoff-vehicle')?.value || '';
        driver_split_ratio = parseFloat(document.getElementById('inp-driver-split-ratio')?.value) || 50;
    } else {
        driver = document.getElementById('inp-driver')?.value || '';
    }

    const notes = is_split_trip 
        ? (document.getElementById('inp-notes-drop-hook')?.value || document.getElementById('inp-notes')?.value || '')
        : (document.getElementById('inp-notes')?.value || '');

    // Hiệu ứng Visual Feedback trên nút Lưu
    const submitBtn = document.getElementById('btn-submit-trip') || document.querySelector('#form-create-trip button');
    let originalBtnHtml = '';
    if (submitBtn) {
        originalBtnHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin text-lg mr-1.5"></i> Đang lưu & phát lệnh Zalo...';
    }

    try {
        const formData = new FormData();
        if (booking_order_id) formData.append('booking_order_id', booking_order_id);
        formData.append('customer', customer);
        formData.append('type', type);
        formData.append('container_type', container_type);
        formData.append('container', container);
        formData.append('booking', booking);
        formData.append('seal', seal);
        formData.append('cutoff', cutoff);
        formData.append('vgm_weight', vgm_weight);
        formData.append('commercial_invoice', commercial_invoice);
        formData.append('warehouse_dock', warehouse_dock);
        formData.append('loading_time', loading_time);
        formData.append('cont_location_type', cont_location_type);
        formData.append('pickup', pickup);
        formData.append('warehouse', warehouse);
        formData.append('dropoff', dropoff);
        formData.append('driver', driver);
        formData.append('vehicle', vehicle);
        formData.append('notes', notes);
        formData.append('cargo_notes', notes);
        formData.append('is_split_trip', is_split_trip ? 'true' : 'false');
        formData.append('dropoff_driver', dropoff_driver);
        formData.append('dropoff_vehicle', dropoff_vehicle);
        formData.append('driver_split_ratio', driver_split_ratio);
        formData.append('is_twin_container', is_twin_container ? 'true' : 'false');
        formData.append('container_2', container_2);
        formData.append('seal_2', seal_2);
        formData.append('booking_2', booking_2);
        formData.append('vgm_weight_2', vgm_weight_2);
        formData.append('cargo_notes_2', cargo_notes_2);
        formData.append('det_free_days', det_free_days);
        formData.append('dem_free_days', dem_free_days);
        formData.append('det_expiry_date', det_expiry_date);
        formData.append('dem_expiry_date', dem_expiry_date);
        formData.append('container_condition', container_condition);
        formData.append('damage_description', damage_description);

        const fileInput = document.getElementById('inp-booking-file');
        if (tripBookingFilesList && tripBookingFilesList.length > 0) {
            formData.append('booking_file', tripBookingFilesList[0]);
            tripBookingFilesList.forEach(file => {
                formData.append('booking_files', file);
            });
        } else if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('booking_file', fileInput.files[0]);
        }

        const res = await fetchWithAuth('/api/trips/', {
            method: 'POST',
            body: formData
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.success) {
            closeModal('modal-create-trip');
            const createTripView = document.getElementById('view-create-trip');
            if (createTripView) createTripView.classList.add('hidden-view');
            const formCreateTrip = document.getElementById('form-create-trip');
            if (formCreateTrip) formCreateTrip.reset();
            clearBookingFileSelection();
            loadTripsData();

            // Tự động sao chép Lệnh điều xe và mở Zalo nếu có tài xế
            const message = buildDriverZaloMessage(result);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(message).catch(() => {});
            }

            if (result.driver_phone) {
                const cleanPhone = String(result.driver_phone).replace(/\D/g, '');
                showToast('success', `Đã tạo lệnh ${result.trip_code}! Đã sao chép nội dung Lệnh & Mở Zalo tài xế (${result.driver_name || cleanPhone}). Hãy dán (Ctrl+V) để gửi ngay!`, 'Tạo Lệnh & Sao Chép Zalo');
                window.open(`https://zalo.me/${cleanPhone}`, '_blank');
            } else {
                showToast('success', result.message || 'Tạo lệnh điều động thành công!', 'Thành công');
            }

            // Chuyển hướng xem chi tiết chuyến xe vừa tạo
            const targetTripCode = result.trip_code || result.id;
            if (targetTripCode) {
                viewTripDetail(targetTripCode, true);
            } else {
                backToDispatch();
            }
        } else {
            let errorMsg = result.message || result.error || result.detail;
            if (!errorMsg && typeof result === 'object' && Object.keys(result).length > 0) {
                const fieldErrors = Object.entries(result)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join(' | ');
                if (fieldErrors) errorMsg = fieldErrors;
            }
            errorMsg = errorMsg || 'Vui lòng kiểm tra lại dữ liệu nhập.';
            showToast('danger', errorMsg, 'Lỗi nghiệp vụ');
        }
    } catch (err) {
        console.error('Error submitting trip:', err);
        showToast('danger', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.', 'Lỗi kết nối');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}

// --- 5. CAMERA OCR QUÉT CHỨNG TỪ & PHÍ PHÁT SINH (APP TÀI XẾ) ---
function openOcrApp(mode) {
    currentOcrMode = mode;
    if (mode === 'phi-ton') {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-bold ph-camera text-amber-600 text-xl mr-2"></i> Báo Cáo Phí Phát Sinh';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Hóa Đơn / Vé Trạm BOT';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ tự động trích xuất số tiền chi phí.';
    } else {
        document.getElementById('ocr-modal-title').innerHTML = '<i class="ph-bold ph-file-text text-emerald-600 text-xl mr-2"></i> Trả Chứng Từ Hoàn Thành';
        document.getElementById('ocr-upload-text').innerText = 'Chụp Phiếu EIR / Biên Bản POD';
        document.getElementById('ocr-upload-sub').innerText = 'AI OCR sẽ nhận diện số Cont, Seal để đối chiếu lệnh.';
    }
    openModal('modal-ocr');
}

function resetOcr() {
    document.getElementById('ocr-step-1').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('hidden-view');
    document.getElementById('ocr-step-3').classList.add('hidden-view');
    document.getElementById('ocr-form-expense').classList.add('hidden-view');
    document.getElementById('ocr-form-document').classList.add('hidden-view');
}

function startOcrScan() {
    document.getElementById('ocr-step-1').classList.add('hidden-view');
    document.getElementById('ocr-step-2').classList.remove('hidden-view');
    document.getElementById('ocr-step-2').classList.add('flex');
    
    setTimeout(() => {
        document.getElementById('ocr-step-2').classList.add('hidden-view');
        document.getElementById('ocr-step-2').classList.remove('flex');
        document.getElementById('ocr-step-3').classList.remove('hidden-view');
        
        if (currentOcrMode === 'phi-ton') {
            document.getElementById('ocr-form-expense').classList.remove('hidden-view');
            document.getElementById('ocr-raw-text').innerText = 'Dữ liệu gốc OCR: "Trạm thu phí Cầu Đồng Nai - 120.000 VNĐ"';
        } else {
            document.getElementById('ocr-form-document').classList.remove('hidden-view');
            const contVal = document.getElementById('detail-cont').innerText;
            const sealVal = document.getElementById('detail-seal').innerText;
            document.getElementById('ocr-raw-text').innerText = `Dữ liệu gốc OCR: "Phiếu Giao Nhận EIR - Cont: ${contVal}"`;
            document.getElementById('ocr-doc-cont').value = contVal;
            document.getElementById('ocr-doc-seal').value = sealVal !== '-' ? sealVal : 'SL-998877';
        }
    }, 1000);
}

async function submitOcrData() {
    if (!currentActiveTripCode) return;

    if (currentOcrMode === 'phi-ton') {
        const category = document.getElementById('ocr-expense-type').value;
        const amount = parseNumberVN(document.getElementById('ocr-amount').value);
        const raw_ocr = document.getElementById('ocr-raw-text').innerText;

        try {
            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/expenses/`, {
                method: 'POST',
                body: JSON.stringify({ category, amount, raw_ocr })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã ghi nhận chi phí');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi gửi báo cáo chi phí.');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi báo cáo chi phí.');
        }
    } else {
        const doc_type = document.getElementById('ocr-doc-type').value;
        const container_no = document.getElementById('ocr-doc-cont').value;
        const seal_no = document.getElementById('ocr-doc-seal').value;

        try {
            const res = await fetchWithAuth(`/api/trips/${currentActiveTripCode}/documents/`, {
                method: 'POST',
                body: JSON.stringify({ doc_type, container_no, seal_no })
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                closeModal('modal-ocr');
                viewTripDetail(currentActiveTripCode);
                showToast('success', resData.message, 'Đã nghiệm thu chứng từ');
            } else {
                showToast('danger', resData.message || resData.error || resData.detail || 'Lỗi khi gửi chứng từ hoàn tất.');
            }
        } catch (err) {
            showToast('danger', 'Lỗi khi gửi chứng từ hoàn tất.');
        }
    }
}

// Window Global Exports cho Điều Vận
if (typeof window !== 'undefined') {
    window.openCreateTripPage = openCreateTripPage;
    window.backToDispatch = backToDispatch;
}

