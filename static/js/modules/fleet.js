/**
 * BIM LOGISTICS — MODULE QUẢN LÝ ĐỘI XE, RƠ-MOÓC & BÃI (FLEET)
 */

// --- 7. ĐỘI XE & BÃI ---
let rawFleetVehicles = [];
let fleetSortColumn = null;
let fleetSortDirection = 'asc';

function populateFleetFilterDropdowns(vehicles) {
    if (!vehicles || !Array.isArray(vehicles)) return;
    const typeSelect = document.getElementById('filter-fleet-type');
    if (typeSelect) {
        const curVal = typeSelect.value;
        const types = [...new Set(vehicles.map(v => (v.type || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        typeSelect.innerHTML = '<option value="">-- Tất cả Loại phương tiện --</option>' + 
            types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        if (types.includes(curVal)) typeSelect.value = curVal;
    }
}

function clearFleetSearch() {
    const input = document.getElementById('filter-fleet-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyFleetFilters();
}

function resetFleetFilters() {
    const type = document.getElementById('filter-fleet-type');
    if (type) type.value = '';
    const status = document.getElementById('filter-fleet-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-fleet-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    fleetSortColumn = null;
    fleetSortDirection = 'asc';
    applyFleetFilters();
}

function toggleFleetSort(col) {
    if (fleetSortColumn === col) {
        fleetSortDirection = fleetSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        fleetSortColumn = col;
        fleetSortDirection = 'asc';
    }
    applyFleetFilters();
}

function applyFleetFilters() {
    if (!rawFleetVehicles || !Array.isArray(rawFleetVehicles)) return;

    const filterType = document.getElementById('filter-fleet-type')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-fleet-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-fleet-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-fleet-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawFleetVehicles.filter(v => {
        if (filterType && (v.type || '').toLowerCase() !== filterType) return false;

        if (filterStatus) {
            if (filterStatus === 'REG_WARNING') {
                if (!v.is_reg_warning) return false;
            } else if (filterStatus === 'MAINT_WARNING') {
                if (!v.is_maint_warning) return false;
            } else if (v.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                v.plate,
                v.type,
                v.driver,
                v.reg_expiry,
                v.maint_date,
                v.status
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('fleet-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('fleet-total-count');
    if (totalCountEl) totalCountEl.innerText = rawFleetVehicles.length;

    // Sắp xếp
    if (fleetSortColumn) {
        list.sort((a, b) => {
            let valA = (a[fleetSortColumn] || '').toString();
            let valB = (b[fleetSortColumn] || '').toString();
            const cmp = valA.localeCompare(valB, 'vi');
            return fleetSortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // Cập nhật icon thead
    const sortCols = ['plate', 'type', 'driver', 'reg_expiry', 'maint_date', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-fleet-${col}`);
        if (iconEl) {
            if (fleetSortColumn === col) {
                iconEl.className = fleetSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderFleetTable(list);
}

function renderFleetTable(vehicles) {
    const tbody = document.getElementById('fleet-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!vehicles || vehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-truck text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy phương tiện nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetFleetFilters()" class="mt-2.5 px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    vehicles.forEach(v => {
        let statusCls = 'bg-emerald-100 text-emerald-800';
        if (v.is_reg_expired) statusCls = 'bg-rose-100 text-rose-700 font-black';
        else if (v.is_reg_warning || v.is_maint_warning || v.is_ins_warning) statusCls = 'bg-amber-100 text-amber-700 font-bold';

        let regBadge = '';
        if (v.is_reg_expired) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 mt-0.5"><i class="ph-bold ph-warning-circle mr-1"></i>Hết hạn (${Math.abs(v.reg_days_left)}N)</span>`;
        } else if (v.is_reg_warning) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"><i class="ph-bold ph-clock mr-1"></i>Còn ${v.reg_days_left} ngày</span>`;
        } else if (v.reg_days_left !== null && v.reg_days_left !== undefined) {
            regBadge = `<span class="text-[10.5px] text-emerald-600 font-bold mt-0.5 block">Hợp lệ (${v.reg_days_left}N)</span>`;
        }

        let maintBadge = '';
        if (v.is_maint_warning) {
            maintBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"><i class="ph-bold ph-wrench mr-1"></i>Đến hạn (${v.maint_days_left}N)</span>`;
        } else if (v.maint_days_left !== null && v.maint_days_left !== undefined) {
            maintBadge = `<span class="text-[10.5px] text-slate-400 font-medium mt-0.5 block">Còn ${v.maint_days_left}N</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-200/80';
        tr.innerHTML = `
            <td class="p-4 font-black text-slate-900 font-heading text-sm">${escapeHtml(v.plate)}</td>
            <td class="p-4 font-medium text-slate-700 text-sm">
                <div>${escapeHtml(v.type)}</div>
                <span class="text-[10.5px] font-bold ${v.ownership_code === 'OWNED' ? 'text-teal-700' : 'text-amber-700'}">${escapeHtml(v.ownership_type)}</span>
            </td>
            <td class="p-4 font-bold text-slate-800 text-sm">${escapeHtml(v.driver)}</td>
            <td class="p-4 text-sm font-medium">
                <div class="${v.is_reg_expired ? 'text-rose-700 font-black' : v.is_reg_warning ? 'text-amber-700 font-bold' : 'text-slate-700'}">${escapeHtml(v.reg_expiry)}</div>
                ${regBadge}
            </td>
            <td class="p-4 text-sm font-medium">
                <div class="${v.is_maint_warning ? 'text-amber-600 font-bold' : 'text-slate-600'}">${escapeHtml(v.maint_date)}</div>
                ${maintBadge}
            </td>
            <td class="p-4">
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(v.status)}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadFleetData() {
    try {
        const res = await fetchWithAuth('/api/fleet/');
        if (!res.ok) throw new Error('Lỗi tải đội xe');
        const data = await res.json();

        document.getElementById('fleet-stat-tractors').innerText = data.total_tractors;
        document.getElementById('fleet-stat-trailers').innerText = data.total_trailers;
        document.getElementById('fleet-stat-reg').innerText = data.reg_warning_count;
        document.getElementById('fleet-stat-maint').innerText = data.maint_warning_count;

        rawFleetVehicles = data.vehicles || [];
        populateFleetFilterDropdowns(rawFleetVehicles);
        applyFleetFilters();
    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
}

