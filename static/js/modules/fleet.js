// --- 7. ĐỘI XE, RƠ-MOÓC & BÃI ---
let currentFleetSubTab = 'vehicles'; // 'vehicles' | 'trailers'
let rawFleetVehicles = [];
let rawFleetTrailers = [];
let fleetSortColumn = null;
let fleetSortDirection = 'asc';
let trailerSortColumn = null;
let trailerSortDirection = 'asc';

function switchFleetSubTab(tab) {
    currentFleetSubTab = tab === 'trailers' ? 'trailers' : 'vehicles';
    const btnVehicles = document.getElementById('fleet-tab-btn-vehicles');
    const btnTrailers = document.getElementById('fleet-tab-btn-trailers');
    const panelVehicles = document.getElementById('fleet-panel-vehicles');
    const panelTrailers = document.getElementById('fleet-panel-trailers');
    const btnCreateLabel = document.getElementById('btn-fleet-create-label');

    if (currentFleetSubTab === 'vehicles') {
        if (btnVehicles) {
            btnVehicles.className = 'fleet-subtab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center space-x-2 bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs cursor-pointer';
        }
        if (btnTrailers) {
            btnTrailers.className = 'fleet-subtab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent cursor-pointer';
        }
        if (panelVehicles) panelVehicles.classList.remove('hidden');
        if (panelTrailers) panelTrailers.classList.add('hidden');
        if (btnCreateLabel) btnCreateLabel.innerText = 'Thêm Đầu Kéo';
        applyFleetFilters();
    } else {
        if (btnVehicles) {
            btnVehicles.className = 'fleet-subtab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent cursor-pointer';
        }
        if (btnTrailers) {
            btnTrailers.className = 'fleet-subtab-btn px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center space-x-2 bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs cursor-pointer';
        }
        if (panelVehicles) panelVehicles.classList.add('hidden');
        if (panelTrailers) panelTrailers.classList.remove('hidden');
        if (btnCreateLabel) btnCreateLabel.innerText = 'Thêm Rơ-Moóc';
        applyTrailerFilters();
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
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(v.status)}</span>
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
        let statusCls = 'bg-slate-100 text-slate-700';
        if (t.status_raw === 'ACTIVE' || (t.status && t.status.includes('Đang kéo'))) {
            statusCls = 'bg-emerald-100 text-emerald-800';
        } else if (t.status_raw === 'IDLE' || (t.status && t.status.includes('Nằm bãi'))) {
            statusCls = 'bg-teal-100 text-teal-800';
        } else if (t.status_raw === 'MAINTENANCE' || (t.status && (t.status.includes('Bảo trì') || t.status.includes('Hư hỏng')))) {
            statusCls = 'bg-amber-100 text-amber-800 font-bold';
        }

        let regBadge = '';
        if (t.is_reg_expired) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 mt-0.5"><i class="ph-bold ph-warning-circle mr-1"></i>Hết hạn (${Math.abs(t.reg_days_left)}N)</span>`;
        } else if (t.is_reg_warning) {
            regBadge = `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 mt-0.5"><i class="ph-bold ph-clock mr-1"></i>Còn ${t.reg_days_left} ngày</span>`;
        } else if (t.reg_days_left !== null && t.reg_days_left !== undefined) {
            regBadge = `<span class="text-[10.5px] text-emerald-600 font-bold mt-0.5 block">Hợp lệ (${t.reg_days_left}N)</span>`;
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
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider font-heading ${statusCls}">${escapeHtml(t.status)}</span>
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

        const badgeTractorsEl = document.getElementById('fleet-badge-tractors-count');
        if (badgeTractorsEl) badgeTractorsEl.innerText = data.total_tractors || 0;
        const badgeTrailersEl = document.getElementById('fleet-badge-trailers-count');
        if (badgeTrailersEl) badgeTrailersEl.innerText = data.total_trailers || 0;

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