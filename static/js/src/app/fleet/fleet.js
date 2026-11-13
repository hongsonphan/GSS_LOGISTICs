// --- 7. ĐỘI XE, RƠ-MOÓC & BÃI ---
let currentFleetSubTab = 'vehicles'; // 'vehicles' | 'trailers'
let rawFleetVehicles = [];
let rawFleetTrailers = [];
let fleetSortColumn = null;
let fleetSortDirection = 'asc';
let trailerSortColumn = null;
let trailerSortDirection = 'asc';

function switchFleetSubTab(tab) {
    currentFleetSubTab = tab;
    const btnVehicles = document.getElementById('fleet-tab-btn-vehicles');
    const btnTrailers = document.getElementById('fleet-tab-btn-trailers');
    const btnDepot = document.getElementById('fleet-tab-btn-depot');
    const panelVehicles = document.getElementById('fleet-panel-vehicles');
    const panelTrailers = document.getElementById('fleet-panel-trailers');
    const panelDepot = document.getElementById('fleet-panel-depot');
    const btnCreateLabel = document.getElementById('btn-fleet-create-label');

    const activeClassTeal = 'fleet-subtab-btn flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-teal-600 bg-teal-50/70 text-teal-900 shadow-2xs box-border';
    const activeClassIndigo = 'fleet-subtab-btn flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs box-border';
    const inactiveClass = 'fleet-subtab-btn flex-1 md:flex-initial h-10 px-4 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-2 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border';

    if (btnVehicles) btnVehicles.className = tab === 'vehicles' ? activeClassTeal : inactiveClass;
    if (btnTrailers) btnTrailers.className = tab === 'trailers' ? activeClassIndigo : inactiveClass;
    if (btnDepot) btnDepot.className = tab === 'depot' ? activeClassTeal : inactiveClass;

    if (panelVehicles) panelVehicles.classList.toggle('hidden', tab !== 'vehicles');
    if (panelTrailers) panelTrailers.classList.toggle('hidden', tab !== 'trailers');
    if (panelDepot) panelDepot.classList.toggle('hidden', tab !== 'depot');

    if (tab === 'vehicles') {
        if (btnCreateLabel) btnCreateLabel.innerText = 'Thêm Đầu Kéo';
        applyFleetFilters();
    } else if (tab === 'trailers') {
        if (btnCreateLabel) btnCreateLabel.innerText = 'Thêm Rơ-Moóc';
        applyTrailerFilters();
    } else if (tab === 'depot') {
        if (btnCreateLabel) btnCreateLabel.innerText = 'Nhập Bãi';
        loadDepotStats();
        loadDepotMovements();
    }
}

function filterFleetByWarning(warnType) {
    if (warnType === 'REG_WARNING') {
        const vehRegWarn = (rawFleetVehicles || []).filter(v => v.is_reg_warning || v.is_reg_expired).length;
        const trlRegWarn = (rawFleetTrailers || []).filter(t => t.is_reg_warning || t.is_reg_expired).length;
        if (trlRegWarn > 0 && vehRegWarn === 0) {
            switchFleetSubTab('trailers');
        } else if (currentFleetSubTab === 'trailers' && trlRegWarn > 0) {
            switchFleetSubTab('trailers');
        } else {
            switchFleetSubTab('vehicles');
        }
        const statusVeh = document.getElementById('filter-fleet-status');
        if (statusVeh) statusVeh.value = 'REG_WARNING';
        const statusTrl = document.getElementById('filter-trailer-status');
        if (statusTrl) statusTrl.value = 'REG_WARNING';
        applyFleetFilters();
        applyTrailerFilters();
    } else if (warnType === 'MAINT_WARNING') {
        switchFleetSubTab('vehicles');
        const statusVeh = document.getElementById('filter-fleet-status');
        if (statusVeh) statusVeh.value = 'MAINT_WARNING';
        applyFleetFilters();
    }
}

async function openCreateFleetItemModal() {
    if (currentFleetSubTab === 'trailers') {
        if (typeof openMasterDataModalQuick === 'function') {
            await openMasterDataModalQuick('trailers');
        }
    } else {
        if (typeof openMasterDataModalQuick === 'function') {
            await openMasterDataModalQuick('vehicles');
        }
    }
}

async function editFleetVehicle(id) {
    if (typeof openEditMasterDataModal === 'function') {
        currentMasterDataTab = 'vehicles';
        await openEditMasterDataModal(id);
    }
}

async function editFleetTrailer(id) {
    if (typeof openEditMasterDataModal === 'function') {
        currentMasterDataTab = 'trailers';
        await openEditMasterDataModal(id);
    }
}

function exportCurrentFleetList() {
    const isTrailer = currentFleetSubTab === 'trailers';
    const list = isTrailer ? (rawFleetTrailers || []) : (rawFleetVehicles || []);
    if (!list || !list.length) {
        if (typeof showToast === 'function') {
            showToast('warning', 'Không có dữ liệu phương tiện để xuất.', 'Thông Báo');
        }
        return;
    }

    let csvContent = '\uFEFF';
    if (isTrailer) {
        csvContent += 'STT,Biển Số Moóc,Quy Cách / Loại Moóc,Hãng Sản Xuất,Tải Trọng (kg),Hạn Đăng Kiểm,Trạng Thái\n';
        list.forEach((t, i) => {
            const row = [
                i + 1,
                `"${(t.plate || '').replace(/"/g, '""')}"`,
                `"${(t.type || '').replace(/"/g, '""')}"`,
                `"${(t.brand || '').replace(/"/g, '""')}"`,
                `"${(t.payload_display || '').replace(/"/g, '""')}"`,
                `"${(t.reg_expiry || '').replace(/"/g, '""')}"`,
                `"${(t.status || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\n';
        });
    } else {
        csvContent += 'STT,Biển Số Xe,Loại Xe,Hình Thức Sở Hữu,Tài Xế Mặc Định,Hạn Đăng Kiểm,Lịch Bảo Trì,Trạng Thái\n';
        list.forEach((v, i) => {
            const row = [
                i + 1,
                `"${(v.plate || '').replace(/"/g, '""')}"`,
                `"${(v.type || '').replace(/"/g, '""')}"`,
                `"${(v.ownership_type || '').replace(/"/g, '""')}"`,
                `"${(v.driver || '').replace(/"/g, '""')}"`,
                `"${(v.reg_expiry || '').replace(/"/g, '""')}"`,
                `"${(v.maint_date || '').replace(/"/g, '""')}"`,
                `"${(v.status || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\n';
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${isTrailer ? 'Danh_Sach_Ro_Mooc' : 'Danh_Sach_Dau_Keo'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') {
        showToast('success', `Đã xuất danh sách ${isTrailer ? 'Rơ-Moóc' : 'Đầu Kéo'} thành công!`, 'Thành Công');
    }
}

// --- QUẢN LÝ ĐẦU KÉO & XE TẢI ---
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
                if (!v.is_reg_warning && !v.is_reg_expired) return false;
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
                <td colspan="8" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-truck text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy phương tiện nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetFleetFilters()" class="mt-2.5 px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    vehicles.forEach((v, idx) => {
        let statusCls = 'text-emerald-700 font-bold';
        if (v.is_reg_expired) statusCls = 'text-rose-700 font-black';
        else if (v.is_reg_warning || v.is_maint_warning || v.is_ins_warning) statusCls = 'text-amber-700 font-bold';

        let regBadge = '';
        if (v.is_reg_expired) {
            regBadge = `<span class="text-[11px] font-bold text-rose-700 mt-0.5 inline-flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i>Hết hạn (${Math.abs(v.reg_days_left)}N)</span>`;
        } else if (v.is_reg_warning) {
            regBadge = `<span class="text-[11px] font-bold text-amber-700 mt-0.5 inline-flex items-center gap-1"><i class="ph-bold ph-clock"></i>Còn ${v.reg_days_left} ngày</span>`;
        } else if (v.reg_days_left !== null && v.reg_days_left !== undefined) {
            regBadge = `<span class="text-[11px] text-emerald-700 font-bold mt-0.5 block">Hợp lệ (${v.reg_days_left}N)</span>`;
        }

        let maintBadge = '';
        if (v.is_maint_warning) {
            maintBadge = `<span class="text-[11px] font-bold text-amber-700 mt-0.5 inline-flex items-center gap-1"><i class="ph-bold ph-wrench"></i>Đến hạn (${v.maint_days_left}N)</span>`;
        } else if (v.maint_days_left !== null && v.maint_days_left !== undefined) {
            maintBadge = `<span class="text-[11px] text-slate-500 font-medium mt-0.5 block">Còn ${v.maint_days_left}N</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-200/80';
        tr.innerHTML = `
            <td class="p-4 text-center font-mono text-xs font-bold text-slate-500 tabular-nums select-none border-r border-slate-200/70 w-12">
                ${idx + 1}
            </td>
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
                <span class="text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(v.status)}</span>
            </td>
            <td class="p-4 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button type="button" onclick="editFleetVehicle(${v.id})" class="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer" title="Chỉnh sửa thông tin phương tiện">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.BimTableFooter && Array.isArray(vehicles)) {
        const activeVehicles = vehicles.filter(v => v.status === 'Hoạt động' || v.status === 'ACTIVE').length;
        const maintVehicles = vehicles.filter(v => v.status === 'Bảo trì' || v.status === 'MAINTENANCE').length;
        window.BimTableFooter.render('fleet-vehicles-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${vehicles.length}</span> phương tiện | Hoạt động: <span class="text-emerald-700 font-bold">${activeVehicles}</span> | Đang bảo dưỡng / dừng: <span class="text-amber-700 font-bold">${maintVehicles}</span>`, colspan: 6, class: 'text-slate-700' },
                { text: '', align: 'center' }
            ]
        });
    }
}

// --- QUẢN LÝ RƠ-MOÓC CONTAINER ---
function populateTrailerFilterDropdowns(trailers) {
    if (!trailers || !Array.isArray(trailers)) return;
    const typeSelect = document.getElementById('filter-trailer-type');
    if (typeSelect) {
        const curVal = typeSelect.value;
        const types = [...new Set(trailers.map(t => (t.type || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        typeSelect.innerHTML = '<option value="">-- Tất cả Loại Rơ-moóc --</option>' + 
            types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        if (types.includes(curVal)) typeSelect.value = curVal;
    }
}

function clearTrailerSearch() {
    const input = document.getElementById('filter-trailer-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('btn-clear-trailer-search');
    if (clearBtn) clearBtn.classList.add('hidden');
    applyTrailerFilters();
}

function resetTrailerFilters() {
    const type = document.getElementById('filter-trailer-type');
    if (type) type.value = '';
    const status = document.getElementById('filter-trailer-status');
    if (status) status.value = '';
    const search = document.getElementById('filter-trailer-search');
    if (search) search.value = '';
    const clearBtn = document.getElementById('btn-clear-trailer-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    trailerSortColumn = null;
    trailerSortDirection = 'asc';
    applyTrailerFilters();
}

function toggleTrailerSort(col) {
    if (trailerSortColumn === col) {
        trailerSortDirection = trailerSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        trailerSortColumn = col;
        trailerSortDirection = 'asc';
    }
    applyTrailerFilters();
}

function applyTrailerFilters() {
    if (!rawFleetTrailers || !Array.isArray(rawFleetTrailers)) return;

    const filterType = document.getElementById('filter-trailer-type')?.value?.trim().toLowerCase() || '';
    const filterStatus = document.getElementById('filter-trailer-status')?.value?.trim() || '';
    const filterSearch = document.getElementById('filter-trailer-search')?.value?.trim().toLowerCase() || '';

    const clearBtn = document.getElementById('btn-clear-trailer-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawFleetTrailers.filter(t => {
        if (filterType && (t.type || '').toLowerCase() !== filterType) return false;

        if (filterStatus) {
            if (filterStatus === 'REG_WARNING') {
                if (!t.is_reg_warning && !t.is_reg_expired) return false;
            } else if (t.status_raw !== filterStatus && t.status !== filterStatus) {
                return false;
            }
        }

        if (filterSearch) {
            const combinedText = [
                t.plate,
                t.type,
                t.brand,
                t.payload_display,
                t.reg_expiry,
                t.status
            ].filter(Boolean).join(' ').toLowerCase();

            if (!combinedText.includes(filterSearch)) return false;
        }

        return true;
    });

    // Cập nhật số đếm
    const filteredCountEl = document.getElementById('trailer-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('trailer-total-count');
    if (totalCountEl) totalCountEl.innerText = rawFleetTrailers.length;

    // Sắp xếp
    if (trailerSortColumn) {
        list.sort((a, b) => {
            let valA = '';
            let valB = '';
            if (trailerSortColumn === 'payload') {
                valA = a.payload_capacity_kg || 0;
                valB = b.payload_capacity_kg || 0;
                return trailerSortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                valA = (a[trailerSortColumn] || '').toString();
                valB = (b[trailerSortColumn] || '').toString();
                const cmp = valA.localeCompare(valB, 'vi');
                return trailerSortDirection === 'asc' ? cmp : -cmp;
            }
        });
    }

    // Cập nhật icon thead
    const sortCols = ['plate', 'type', 'brand', 'payload', 'reg_expiry', 'status'];
    sortCols.forEach(col => {
        const iconEl = document.getElementById(`sort-icon-trailer-${col}`);
        if (iconEl) {
            if (trailerSortColumn === col) {
                iconEl.className = trailerSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-indigo-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-indigo-600 text-xs';
            } else {
                iconEl.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    renderTrailerTable(list);
}

function renderTrailerTable(trailers) {
    const tbody = document.getElementById('trailer-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!trailers || trailers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-10 text-slate-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-arrows-horizontal text-3xl mb-2 text-slate-300"></i>
                        <p class="font-medium text-sm text-slate-500">Không tìm thấy rơ-moóc nào phù hợp với bộ lọc</p>
                        <p class="text-xs text-slate-400 mt-1">Thử đổi điều kiện lọc hoặc bấm "Đặt lại"</p>
                        <button onclick="resetTrailerFilters()" class="mt-2.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                            Đặt lại bộ lọc
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    trailers.forEach((t, idx) => {
        let statusCls = 'text-slate-700 font-bold';
        if (t.status_raw === 'ACTIVE' || (t.status && t.status.includes('Đang kéo'))) {
            statusCls = 'text-emerald-700 font-bold';
        } else if (t.status_raw === 'IDLE' || (t.status && t.status.includes('Nằm bãi'))) {
            statusCls = 'text-teal-700 font-bold';
        } else if (t.status_raw === 'MAINTENANCE' || (t.status && (t.status.includes('Bảo trì') || t.status.includes('Hư hỏng')))) {
            statusCls = 'text-amber-700 font-bold';
        }

        let regBadge = '';
        if (t.is_reg_expired) {
            regBadge = `<span class="text-[11px] font-bold text-rose-700 mt-0.5 inline-flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i>Hết hạn (${Math.abs(t.reg_days_left)}N)</span>`;
        } else if (t.is_reg_warning) {
            regBadge = `<span class="text-[11px] font-bold text-amber-700 mt-0.5 inline-flex items-center gap-1"><i class="ph-bold ph-clock"></i>Còn ${t.reg_days_left} ngày</span>`;
        } else if (t.reg_days_left !== null && t.reg_days_left !== undefined) {
            regBadge = `<span class="text-[11px] text-emerald-700 font-bold mt-0.5 block">Hợp lệ (${t.reg_days_left}N)</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-200/80';
        tr.innerHTML = `
            <td class="p-4 text-center font-mono text-xs font-bold text-slate-500 tabular-nums select-none border-r border-slate-200/70 w-12">
                ${idx + 1}
            </td>
            <td class="p-4 font-black text-slate-900 font-mono text-sm">${escapeHtml(t.plate)}</td>
            <td class="p-4 font-medium text-slate-800 text-sm">
                <div>${escapeHtml(t.type || 'Moóc Container')}</div>
            </td>
            <td class="p-4 font-semibold text-slate-700 text-sm">${escapeHtml(t.brand || '—')}</td>
            <td class="p-4 font-mono font-bold text-slate-900 text-right text-sm tabular-nums">
                ${escapeHtml(t.payload_display || '—')} <span class="text-[11px] font-normal text-slate-500">kg</span>
            </td>
            <td class="p-4 text-sm font-medium">
                <div class="${t.is_reg_expired ? 'text-rose-700 font-black' : t.is_reg_warning ? 'text-amber-700 font-bold' : 'text-slate-700 font-mono font-bold'}">${escapeHtml(t.reg_expiry)}</div>
                ${regBadge}
            </td>
            <td class="p-4">
                <span class="text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(t.status || '—')}</span>
            </td>
            <td class="p-4 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button type="button" onclick="editFleetTrailer(${t.id})" class="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="Chỉnh sửa thông tin rơ-moóc">
                        <i class="ph-bold ph-pencil-simple text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.BimTableFooter && Array.isArray(trailers)) {
        const activeTrailers = trailers.filter(t => t.status_raw === 'ACTIVE' || (t.status || '').includes('Đang kéo')).length;
        const idleTrailers = trailers.filter(t => t.status_raw === 'IDLE' || (t.status || '').includes('Nằm bãi')).length;
        const maintTrailers = trailers.filter(t => t.status_raw === 'MAINTENANCE' || (t.status || '').includes('Bảo trì')).length;
        window.BimTableFooter.render('fleet-trailers-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-indigo-800 font-extrabold">${trailers.length}</span> rơ-moóc | Nằm bãi: <span class="text-teal-700 font-bold">${idleTrailers}</span> | Đang kéo: <span class="text-emerald-700 font-bold">${activeTrailers}</span> | Bảo trì: <span class="text-amber-700 font-bold">${maintTrailers}</span>`, colspan: 6, class: 'text-slate-700' },
                { text: '', align: 'center' }
            ]
        });
    }
}

async function loadFleetData() {
    try {
        const res = await fetchWithAuth('/api/fleet/');
        if (!res.ok) throw new Error('Lỗi tải đội xe');
        const data = await res.json();

        const statTractorsEl = document.getElementById('fleet-stat-tractors');
        if (statTractorsEl) statTractorsEl.innerText = data.total_tractors || 0;
        const statTrailersEl = document.getElementById('fleet-stat-trailers');
        if (statTrailersEl) statTrailersEl.innerText = data.total_trailers || 0;
        const statRegEl = document.getElementById('fleet-stat-reg');
        if (statRegEl) statRegEl.innerText = data.reg_warning_count || 0;
        const statMaintEl = document.getElementById('fleet-stat-maint');
        if (statMaintEl) statMaintEl.innerText = data.maint_warning_count || 0;

        // Cập nhật 2 dòng số liệu nghiệp vụ 5 Thẻ Đội Xe
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerText = val; };
        setTxt('fleet-stat-availability', data.card_availability?.rate || '100%');
        setTxt('fleet-card-tractors-line1', data.card_tractors?.line_1);
        setTxt('fleet-card-tractors-line2', data.card_tractors?.line_2);
        setTxt('fleet-card-trailers-line1', data.card_trailers?.line_1);
        setTxt('fleet-card-trailers-line2', data.card_trailers?.line_2);
        setTxt('fleet-card-avail-line1', data.card_availability?.line_1);
        setTxt('fleet-card-avail-line2', data.card_availability?.line_2);
        setTxt('fleet-card-reg-line1', data.card_reg?.line_1);
        setTxt('fleet-card-reg-line2', data.card_reg?.line_2);
        setTxt('fleet-card-maint-line1', data.card_maint?.line_1);
        setTxt('fleet-card-maint-line2', data.card_maint?.line_2);

        rawFleetVehicles = data.vehicles || [];
        rawFleetTrailers = data.trailers || [];
        populateFleetFilterDropdowns(rawFleetVehicles);
        populateTrailerFilterDropdowns(rawFleetTrailers);
        applyFleetFilters();
        applyTrailerFilters();
    } catch (err) {
        console.error('Error loading fleet data:', err);
    }
}


// =========================================================================
// QUẢN LÝ BÃI CONTAINER (DEPOT YARD) - GSS STANDARD
// =========================================================================
async function loadDepotStats() {
    try {
        const res = await fetchWithAuth('/api/depot/stats/');
        if (!res.ok) return;
        const j = await res.json();
        const d = j.data || j;
        const setT = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setT('depot-stat-total', d.total_in_yard || 0);
        setT('depot-stat-full', d.full_count || 0);
        setT('depot-stat-empty', d.empty_count || 0);
        setT('depot-stat-in-today', `+${d.in_today || 0}`);
        setT('depot-stat-out-today', `-${d.out_today || 0}`);
    } catch (e) {
        console.warn('Lỗi tải thống kê bãi depot:', e);
    }
}

let rawDepotMovements = [];
async function loadDepotMovements() {
    const tbody = document.getElementById('depot-movements-tbody');
    if (!tbody) return;
    const statusVal = document.getElementById('filter-depot-status')?.value || '';
    const searchVal = (document.getElementById('filter-depot-search')?.value || '').trim();

    let url = '/api/depot/movements/?';
    if (statusVal) url += `status=${encodeURIComponent(statusVal)}&`;
    if (searchVal) url += `q=${encodeURIComponent(searchVal)}&`;

    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Không tải được danh sách bãi.');
        const j = await res.json();
        rawDepotMovements = j.results || j.data || j || [];
        renderDepotTable(rawDepotMovements);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" class="p-4 text-center text-rose-500 font-bold">${escapeHtml(e.message)}</td></tr>`;
    }
}

let depotSearchTimeout = null;
function debounceDepotSearch() {
    clearTimeout(depotSearchTimeout);
    depotSearchTimeout = setTimeout(() => { loadDepotMovements(); }, 300);
}

function renderDepotTable(items) {
    const tbody = document.getElementById('depot-movements-tbody');
    if (!tbody) return;
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-4 text-center text-slate-400 italic">Không có container nào phù hợp bộ lọc.</td></tr>';
        return;
    }

    let html = '';
    items.forEach((m, idx) => {
        const isIn = m.status === 'IN_YARD';
        const stBadge = isIn 
            ? '<span class="text-teal-700 font-bold flex items-center gap-1"><i class="ph-bold ph-arrow-down-left"></i> Đang tồn bãi</span>'
            : '<span class="text-slate-500 font-medium flex items-center gap-1"><i class="ph-bold ph-arrow-up-right"></i> Đã rời bãi</span>';
        const cargoBadge = m.cargo_status === 'FULL'
            ? '<span class="text-indigo-700 font-bold">Hàng (Full)</span>'
            : '<span class="text-emerald-700 font-bold">Rỗng (Empty)</span>';

        const fmtDate = (iso) => {
            if (!iso) return '—';
            try {
                const d = new Date(iso);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } catch(e) { return iso; }
        };

        const inTime = fmtDate(m.gate_in_at);
        const outTime = fmtDate(m.gate_out_at);
        const days = m.storage_days != null ? `${m.storage_days} ngày` : '—';

        html += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 font-mono font-black text-slate-800 text-xs">${escapeHtml(m.container_number)}</td>
                <td class="p-2.5 font-bold text-slate-600">${escapeHtml(m.container_type || '40HC')}</td>
                <td class="p-2.5">${cargoBadge}</td>
                <td class="p-2.5 font-mono font-bold text-slate-700">${escapeHtml(m.in_vehicle_plate || '—')}</td>
                <td class="p-2.5 font-mono text-slate-600">${escapeHtml(m.in_trailer_plate || '—')}</td>
                <td class="p-2.5 text-slate-700">${escapeHtml(m.in_driver_name || '—')}</td>
                <td class="p-2.5 font-medium text-slate-600">${inTime}</td>
                <td class="p-2.5 font-medium text-slate-600">${outTime}</td>
                <td class="p-2.5 text-center font-bold text-slate-800 font-heading">${days}</td>
                <td class="p-2.5">${stBadge}</td>
                <td class="p-2.5 text-center">
                    ${isIn ? `
                        <button type="button" onclick="depotGateOutMovement(${m.id}, '${escapeHtml(m.container_number)}')" 
                            class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] cursor-pointer">
                            Gate-Out
                        </button>
                    ` : '<span class="text-slate-400 text-[11px]">Hoàn tất</span>'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function depotGateOutMovement(id, contNum) {
    const plate = prompt(`Xác nhận cho cont [${contNum}] rời bãi (Gate-Out).
Nhập biển số xe kéo cont đi:`);
    if (!plate) return;
    try {
        const res = await fetchWithAuth(`/api/depot/movements/${id}/gate-out/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ out_vehicle_plate: plate.trim() })
        });
        const out = await res.json();
        if (res.ok && out.success) {
            showToast('success', `Đã xác nhận Gate-Out cont ${contNum}!`);
            loadDepotStats();
            loadDepotMovements();
        } else {
            showToast('danger', out.message || 'Lỗi khi Gate-Out.');
        }
    } catch (e) {
        showToast('danger', 'Lỗi: ' + e.message);
    }
}

function openDepotGateInModal() {
    const cont = prompt('Nhập Số Container Gate-In vào bãi:');
    if (!cont) return;
    const plate = prompt('Nhập Biển số xe kéo cont đến:') || '';
    const driver = prompt('Nhập Tên tài xế:') || '';
    
    fetchWithAuth('/api/depot/movements/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            container_number: cont.trim().toUpperCase(),
            in_vehicle_plate: plate.trim().toUpperCase(),
            in_driver_name: driver.trim(),
            cargo_status: 'EMPTY'
        })
    }).then(r => r.json()).then(out => {
        if (out.success) {
            showToast('success', `Đã nhập cont ${cont} vào bãi thành công!`);
            loadDepotStats();
            loadDepotMovements();
        } else {
            showToast('danger', out.message || 'Lỗi khi nhập bãi.');
        }
    }).catch(e => showToast('danger', 'Lỗi: ' + e.message));
}

window.loadDepotStats = loadDepotStats;
window.loadDepotMovements = loadDepotMovements;
window.debounceDepotSearch = debounceDepotSearch;
window.depotGateOutMovement = depotGateOutMovement;
window.openDepotGateInModal = openDepotGateInModal;
