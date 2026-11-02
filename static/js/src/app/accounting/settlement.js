// previousActiveTab is already declared globally at line 915

function returnFromSettlementView() {
    if (typeof previousActiveTab !== 'undefined' && previousActiveTab && previousActiveTab !== 'quyet-toan') {
        if (typeof switchTab === 'function') switchTab(previousActiveTab, true);
    } else {
        if (typeof switchTab === 'function') switchTab('dieu-van', true);
    }
}
window.returnFromSettlementView = returnFromSettlementView;

function openBatchSettlementModal(prefilledDriverId = null, prefilledVehicleId = null) {
    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-quyet-toan') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }
    // Chuyển trực tiếp sang Trang Quyết Toán Gom Chuyến chuyên dụng
    if (typeof switchTab === 'function') {
        switchTab('quyet-toan');
    }
    if (prefilledDriverId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'driver';
            if (typeof onSettlementGroupByChange === 'function') onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledDriverId;
                    if (typeof loadSettlementData === 'function') loadSettlementData();
                }
            }, 100);
        }
    } else if (prefilledVehicleId) {
        const groupBy = document.getElementById('settle-group-by');
        if (groupBy) {
            groupBy.value = 'vehicle';
            if (typeof onSettlementGroupByChange === 'function') onSettlementGroupByChange();
            setTimeout(() => {
                const targetSelect = document.getElementById('settle-target-select');
                if (targetSelect) {
                    targetSelect.value = prefilledVehicleId;
                    if (typeof loadSettlementData === 'function') loadSettlementData();
                }
            }, 100);
        }
    }
}
window.openBatchSettlementModal = openBatchSettlementModal;

function closeBatchSettlementModal() {
    const modal = document.getElementById('modal-batch-driver-settlement');
    if (modal) modal.classList.add('hidden');
}
window.closeBatchSettlementModal = closeBatchSettlementModal;

window.loadBatchSettlementPreview = function() {
    if (typeof loadSettlementData === 'function') return loadSettlementData.apply(this, arguments);
};
window.onBatchGroupByChange = function() {
    if (typeof onSettlementGroupByChange === 'function') return onSettlementGroupByChange.apply(this, arguments);
};
window.toggleSelectAllBatchTrips = function() {
    if (typeof toggleMasterSettlementCheckbox === 'function') return toggleMasterSettlementCheckbox.apply(this, arguments);
};
window.executeBatchSettlementSubmit = function() {
    if (typeof executePageSettlementSubmit === 'function') return executePageSettlementSubmit.apply(this, arguments);
};

// PHÂN HỆ QUYẾT TOÁN GOM CHUYẾN (DRIVER SETTLEMENTS VIEW)
// -------------------------------------------------------------
let pageSettlementData = null;
let pageAllTripsList = [];
let batchSettlementData = null;
let batchAllTripsList = [];

function onSettlementGroupByChange() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    populateSettlementTargetOptions(groupBy);
    loadSettlementData();
}

function populateSettlementTargetOptions(groupBy, preselectedId = null) {
    const targetLabel = document.getElementById('settle-target-label');
    const targetSelect = document.getElementById('settle-target-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '<option value="">-- Tất cả --</option>';

    if (groupBy === 'driver') {
        if (targetLabel) targetLabel.innerText = 'Chọn Bác Tài:';
        if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache?.drivers && masterDataFormOptionsCache.drivers.length > 0) {
            masterDataFormOptionsCache.drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = d.label || `${d.full_name || d.nickname} (${d.phone || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawPersonnelList && window.rawPersonnelList.length > 0) {
            const drivers = window.rawPersonnelList.filter(p => p.role === 'DRIVER' || p.role === 'Lái xe' || p.department === 'Đội Xe');
            drivers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.full_name} (${d.nickname || d.phone_number || 'Tài xế'})`;
                if (preselectedId && String(d.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else if (groupBy === 'customer') {
        if (targetLabel) targetLabel.innerText = 'Chọn Khách Hàng:';
        if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache?.customers && masterDataFormOptionsCache.customers.length > 0) {
            masterDataFormOptionsCache.customers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = c.label || `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawCustomersList && window.rawCustomersList.length > 0) {
            window.rawCustomersList.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else {
            fetchWithAuth('/api/customers/').then(r => r.json()).then(data => {
                const list = data.customers || data.results || (Array.isArray(data) ? data : []);
                window.rawCustomersList = list;
                list.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.innerText = `${c.company_name || c.name || c.short_name || 'Khách hàng'}`;
                    if (preselectedId && String(c.id) === String(preselectedId)) opt.selected = true;
                    targetSelect.appendChild(opt);
                });
            }).catch(() => {});
        }
    } else if (groupBy === 'vehicle') {
        if (targetLabel) targetLabel.innerText = 'Chọn Đầu Xe:';
        if (typeof masterDataFormOptionsCache !== 'undefined' && masterDataFormOptionsCache?.vehicles && masterDataFormOptionsCache.vehicles.length > 0) {
            masterDataFormOptionsCache.vehicles.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = v.label || `${v.plate || v.license_plate} (${v.type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        } else if (window.rawFleetVehiclesList && window.rawFleetVehiclesList.length > 0) {
            window.rawFleetVehiclesList.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.innerText = `${v.license_plate} (${v.vehicle_type || 'Đầu kéo'})`;
                if (preselectedId && String(v.id) === String(preselectedId)) opt.selected = true;
                targetSelect.appendChild(opt);
            });
        }
    } else {
        if (targetLabel) targetLabel.innerText = 'Đối tượng:';
        targetSelect.innerHTML = '<option value="">-- Toàn bộ chuyến xe --</option>';
    }
}

function setSettlementDatePreset(preset) {
    const fromDateInp = document.getElementById('settle-from-date');
    const toDateInp = document.getElementById('settle-to-date');
    if (!fromDateInp || !toDateInp) return;

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
        fromDateInp.value = formatD(today);
        toDateInp.value = formatD(today);
    } else if (preset === 'week') {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        fromDateInp.value = formatD(monday);
        toDateInp.value = formatD(new Date());
    } else if (preset === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        fromDateInp.value = formatD(firstDay);
        toDateInp.value = formatD(lastDay);
    } else if (preset === 'last_month') {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        fromDateInp.value = formatD(firstDayPrev);
        toDateInp.value = formatD(lastDayPrev);
    }

    loadSettlementData();
}

function resetSettlementFilters() {
    const groupBy = document.getElementById('settle-group-by');
    if (groupBy) groupBy.value = 'driver';
    populateSettlementTargetOptions('driver');
    const targetSelect = document.getElementById('settle-target-select');
    if (targetSelect) targetSelect.value = '';
    const statusFilter = document.getElementById('settle-status-filter');
    if (statusFilter) statusFilter.value = 'PENDING';
    const searchInp = document.getElementById('settle-search-input');
    if (searchInp) searchInp.value = '';

    setSettlementDatePreset('month');
}

function filterSettlementClientSide() {
    const searchVal = (document.getElementById('settle-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#page-settle-tbody tr.settle-trip-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!searchVal || text.includes(searchVal)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const badgeInfo = document.getElementById('settle-table-badge-info');
    if (badgeInfo) {
        badgeInfo.innerHTML = `Hiển thị: <strong>${visibleCount}</strong> chuyến`;
    }
    onSettlementTripSelectionChange();
}

async function loadSettlementData() {
    const groupBy = document.getElementById('settle-group-by')?.value || 'driver';
    let fromDate = document.getElementById('settle-from-date')?.value || '';
    let toDate = document.getElementById('settle-to-date')?.value || '';
    const targetId = document.getElementById('settle-target-select')?.value || '';
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';

    if (!fromDate || !toDate) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = firstDay.toISOString().slice(0, 10);
        toDate = today.toISOString().slice(0, 10);
        const fromInp = document.getElementById('settle-from-date');
        const toInp = document.getElementById('settle-to-date');
        if (fromInp && !fromInp.value) fromInp.value = fromDate;
        if (toInp && !toInp.value) toInp.value = toDate;
    }

    let url = `/api/accounting/driver-settlements/batch-preview/?group_by=${groupBy}&from_date=${fromDate}&to_date=${toDate}`;
    if (groupBy === 'driver' && targetId) url += `&driver_id=${targetId}`;
    if (groupBy === 'vehicle' && targetId) url += `&vehicle_id=${targetId}`;
    if (groupBy === 'customer' && targetId) url += `&customer_id=${targetId}`;

    const tbody = document.getElementById('page-settle-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-500 font-medium"><i class="ph-bold ph-spinner ph-spin text-3xl mb-2 block text-teal-600"></i> Đang phân tích và gom dữ liệu chuyến xe...</td></tr>`;
    }

    try {
        const res = await fetchWithAuth(url);
        const data = await res.json();
        if (res.ok && data.success) {
            pageSettlementData = data;
            batchSettlementData = data;
            renderSettlementTable(data);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">${data.error || 'Không thể tải dữ liệu'}</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-rose-500 font-bold">Lỗi kết nối máy chủ</td></tr>`;
    }
}

function renderSettlementTable(data) {
    const tbody = document.getElementById('page-settle-tbody');
    const badgeInfo = document.getElementById('settle-table-badge-info');
    const statusFilter = document.getElementById('settle-status-filter')?.value || 'PENDING';
    if (!tbody) return;

    const groups = data.groups || [];
    pageAllTripsList = [];
    batchAllTripsList = [];

    if (groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào trong khoảng thời gian đã chọn.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    let html = '';
    let totalTripsInView = 0;

    groups.forEach((group, gIdx) => {
        let trips = group.trips || [];
        if (statusFilter === 'PENDING') {
            trips = trips.filter(t => !t.is_settled);
        } else if (statusFilter === 'SETTLED') {
            trips = trips.filter(t => t.is_settled);
        }

        if (trips.length === 0) return;
        totalTripsInView += trips.length;

        // Group Header Row
        html += `
            <tr class="bg-teal-50/80 font-bold text-slate-800 border-y border-teal-200 group-header-row" data-group-index="${gIdx}">
                <td colspan="11" class="py-2.5 px-3">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-teal-800 text-white flex items-center justify-center text-xs font-black">
                                ${gIdx + 1}
                            </span>
                            <span class="text-sm font-black text-teal-950">${escapeHtml(group.group_label)}</span>
                            <span class="text-xs text-slate-600 font-normal">(${escapeHtml(group.group_sub)})</span>
                            <button type="button" onclick="toggleGroupSettlementSelection(${gIdx})" class="px-2 py-0.5 rounded bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-bold transition-colors ml-2">
                                Chọn nhóm này
                            </button>
                        </div>
                        <div class="flex items-center gap-4 text-xs">
                            <span class="text-slate-600 font-medium">Số chuyến: <strong class="text-slate-900 font-bold">${trips.length}</strong></span>
                            <span class="text-amber-800 font-medium">Tạm ứng: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.advance_amount || 0), 0))}</strong></span>
                            <span class="text-teal-800 font-medium">Thực chi: <strong class="font-mono font-bold">${formatMoneyVND(trips.reduce((acc, t) => acc + (t.actual_spent || 0), 0))}</strong></span>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        trips.forEach(t => {
            pageAllTripsList.push(t);
            batchAllTripsList.push(t);
            const isSettled = t.is_settled;
            const isChecked = !isSettled;

            let diffBadge = '';
            if (t.diff > 0) {
                diffBadge = `<span class="text-xs font-bold text-blue-700 font-mono tabular-nums">+${formatMoneyVND(t.diff)} (Thừa)</span>`;
            } else if (t.diff < 0) {
                diffBadge = `<span class="text-xs font-bold text-rose-600 font-mono tabular-nums">-${formatMoneyVND(Math.abs(t.diff))} (Bù)</span>`;
            } else {
                diffBadge = `<span class="text-xs font-semibold text-emerald-700 font-mono tabular-nums">0 đ (Khớp)</span>`;
            }

            const podBadge = t.has_pod
                ? `<span class="text-emerald-700 font-bold flex items-center justify-center gap-0.5"><i class="ph-bold ph-check-circle text-xs"></i> Có E-POD</span>`
                : `<span class="text-amber-600 font-medium flex items-center justify-center gap-0.5"><i class="ph-bold ph-clock text-xs"></i> Chờ nộp</span>`;

            const settleStatusBadge = isSettled
                ? `<span class="text-xs font-bold text-purple-800 uppercase">ĐÃ KHÓA SỔ</span>`
                : `<span class="text-xs font-bold text-amber-700 uppercase">CHỜ QUYẾT TOÁN</span>`;

            html += `
                <tr class="hover:bg-teal-50/40 transition-colors settle-trip-row ${isSettled ? 'opacity-70 bg-slate-50/50' : ''}" data-group-index="${gIdx}">
                    <td class="text-center py-2.5 px-3">
                        <input type="checkbox" data-trip-id="${t.id}" data-advance="${t.advance_amount}" data-spent="${t.actual_spent}" data-settled="${isSettled ? '1' : '0'}" data-diff="${t.diff}" data-group="${gIdx}"
                            ${isChecked ? 'checked' : ''} onchange="onSettlementTripSelectionChange()"
                            class="page-settle-checkbox batch-trip-checkbox w-4 h-4 text-teal-600 rounded cursor-pointer">
                    </td>
                    <td class="w-12 text-center select-none font-bold text-slate-500 border-r border-slate-200 font-mono text-xs tabular-nums">
                        ${pageAllTripsList.length}
                    </td>
                    <td class="py-2.5 px-3 font-semibold text-slate-900 font-mono whitespace-nowrap">
                        <div class="font-bold text-teal-900">${escapeHtml(formatCodeCompact(t.trip_code))}</div>
                    </td>
                    <td class="py-2.5 px-3 whitespace-nowrap text-xs font-semibold text-slate-700 text-center">
                        ${escapeHtml(t.loading_date || '-')}
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800 truncate max-w-[200px]" title="${escapeHtml(t.customer_name)}">${escapeHtml(t.customer_name)}</div>
                        <div class="text-[11px] text-slate-500 truncate max-w-[200px]" title="${escapeHtml(t.route)}">${escapeHtml(t.route)}</div>
                    </td>
                    <td class="py-2.5 px-3">
                        <div class="font-bold text-slate-800">${escapeHtml(t.driver_name)}</div>
                        <div class="text-[11px] font-mono font-bold text-teal-800">${escapeHtml(t.license_plate)}</div>
                    </td>
                    <td class="py-2.5 px-3 font-mono text-xs">
                        <div class="font-bold text-slate-800">${escapeHtml(t.container_number)}</div>
                        <div class="text-[11px] text-slate-500">${escapeHtml(t.seal_number)}</div>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-800 tabular-nums">
                        ${formatMoneyVND(t.advance_amount)}
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-teal-800 tabular-nums">
                        ${formatMoneyVND(t.actual_spent)}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${diffBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${podBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                        ${settleStatusBadge}
                    </td>
                    <td class="py-2.5 px-3 text-center cell-actions">
                        <button type="button" onclick="viewTripDetail('${escapeHtml(t.trip_code)}')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-white hover:bg-teal-700 hover:text-white text-teal-700 border border-teal-200 transition-colors shadow-2xs font-heading">
                            Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    if (totalTripsInView === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center py-12 text-slate-400 font-semibold"><i class="ph-bold ph-info text-3xl mb-2 block"></i> Không có chuyến xe nào khớp với bộ lọc trạng thái.</td></tr>`;
        if (badgeInfo) badgeInfo.innerHTML = 'Hiển thị: <strong>0</strong> chuyến';
        onSettlementTripSelectionChange();
        return;
    }

    tbody.innerHTML = html;
    if (badgeInfo) badgeInfo.innerHTML = `Hiển thị: <strong>${totalTripsInView}</strong> chuyến (${groups.length} nhóm)`;
    onSettlementTripSelectionChange();

    if (window.BimTableFooter && Array.isArray(pageAllTripsList)) {
        const totalSettleAdv = pageAllTripsList.reduce((acc, t) => acc + (t.advance_amount || 0), 0);
        const totalSettleSpent = pageAllTripsList.reduce((acc, t) => acc + (t.actual_spent || 0), 0);
        const totalSettleDiff = totalSettleAdv - totalSettleSpent;
        window.BimTableFooter.render('settlement-trips-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading', colspan: 2 },
                { html: `${pageAllTripsList.length} chuyến xe quyết toán`, colspan: 5 },
                { html: `<span class="text-amber-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalSettleAdv)}</span>`, align: 'right' },
                { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${formatMoneyVND(totalSettleSpent)}</span>`, align: 'right' },
                { html: `<span class="${totalSettleDiff >= 0 ? 'text-blue-700' : 'text-rose-700'} font-bold tabular-nums font-mono text-center">${totalSettleDiff >= 0 ? '+' : ''}${formatMoneyVND(totalSettleDiff)}</span>`, align: 'center' },
                { text: '', align: 'center', colspan: 3 }
            ]
        });
    }
}

function selectSettlementTrips(mode) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return; // Bỏ qua dòng bị ẩn bởi ô tìm kiếm

        const isSettled = cb.getAttribute('data-settled') === '1';
        const diff = parseInt(cb.getAttribute('data-diff') || '0', 10);

        if (mode === 'all') {
            cb.checked = true;
        } else if (mode === 'none') {
            cb.checked = false;
        } else if (mode === 'pending_only') {
            cb.checked = !isSettled;
        } else if (mode === 'balanced_only') {
            cb.checked = !isSettled && diff === 0;
        } else if (mode === 'diff_only') {
            cb.checked = !isSettled && diff !== 0;
        }
    });
    onSettlementTripSelectionChange();
}

function toggleGroupSettlementSelection(groupIdx) {
    const groupCheckboxes = document.querySelectorAll(`.page-settle-checkbox[data-group="${groupIdx}"]`);
    if (groupCheckboxes.length === 0) return;
    const anyUnchecked = Array.from(groupCheckboxes).some(cb => !cb.checked);
    groupCheckboxes.forEach(cb => {
        cb.checked = anyUnchecked;
    });
    onSettlementTripSelectionChange();
}

function toggleMasterSettlementCheckbox(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox');
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row && row.style.display === 'none') return;
        cb.checked = masterCheckbox.checked;
    });
    onSettlementTripSelectionChange();
}

function onSettlementTripSelectionChange() {
    const checkboxes = document.querySelectorAll('.page-settle-checkbox:checked');
    let selectedCount = 0;
    let totalAdvance = 0;
    let totalSpent = 0;

    checkboxes.forEach(cb => {
        selectedCount++;
        totalAdvance += parseInt(cb.getAttribute('data-advance') || '0', 10);
        totalSpent += parseInt(cb.getAttribute('data-spent') || '0', 10);
    });

    const netDiff = totalAdvance - totalSpent;

    // Cập nhật 4 thẻ KPI View Quyết toán
    const kpiCount = document.getElementById('page-settle-kpi-count');
    const kpiSub = document.getElementById('page-settle-kpi-sub');
    const kpiAdv = document.getElementById('page-settle-kpi-advance');
    const kpiSpent = document.getElementById('page-settle-kpi-spent');
    const kpiDiffCard = document.getElementById('page-settle-kpi-diff-card');
    const kpiDiffTitle = document.getElementById('page-settle-kpi-diff-title');
    const kpiDiffAmount = document.getElementById('page-settle-kpi-diff-amount');
    const kpiDiffDesc = document.getElementById('page-settle-kpi-diff-desc');
    const kpiDiffIcon = document.getElementById('page-settle-kpi-diff-icon');

    const footerCount = document.getElementById('page-settle-footer-count');
    const btnSubmitText = document.getElementById('btn-page-submit-settle-text');
    const masterCheckbox = document.getElementById('settle-master-checkbox');

    if (kpiCount) kpiCount.innerText = `${selectedCount} chuyến`;
    if (kpiSub) kpiSub.innerText = `Trên tổng số ${pageAllTripsList.length} chuyến trong kỳ`;
    if (kpiAdv) kpiAdv.innerText = formatMoneyVND(totalAdvance);
    if (kpiSpent) kpiSpent.innerText = formatMoneyVND(totalSpent);

    if (footerCount) footerCount.innerText = selectedCount;
    if (btnSubmitText) btnSubmitText.innerText = `XÁC NHẬN QUYẾT TOÁN GOM (${selectedCount} CHUYẾN)`;

    if (masterCheckbox) {
        const allVisible = document.querySelectorAll('.page-settle-checkbox');
        masterCheckbox.checked = allVisible.length > 0 && Array.from(allVisible).every(cb => cb.checked);
    }

    if (kpiDiffCard && kpiDiffAmount && kpiDiffDesc && kpiDiffTitle) {
        if (netDiff > 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-blue-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-blue-800';
            kpiDiffTitle.innerText = 'TÀI XẾ HOÀN TIỀN THỪA';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-blue-700';
            kpiDiffAmount.innerText = `+${formatMoneyVND(netDiff)}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-blue-700';
            kpiDiffDesc.innerText = 'Tài xế nộp hoàn lại vào Quỹ tiền';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm';
        } else if (netDiff < 0) {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-rose-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-rose-800';
            kpiDiffTitle.innerText = 'CÔNG TY CHI TRẢ BÙ';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-rose-700';
            kpiDiffAmount.innerText = `-${formatMoneyVND(Math.abs(netDiff))}`;
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-rose-700';
            kpiDiffDesc.innerText = 'Công ty / ĐV chi bù tiền vượt ứng';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center text-sm';
        } else {
            kpiDiffCard.className = 'bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-600';
            kpiDiffTitle.className = 'text-[12px] font-bold uppercase tracking-wider text-emerald-800';
            kpiDiffTitle.innerText = 'CHÊNH LỆCH ĐỐI SOÁT';
            kpiDiffAmount.className = 'text-2xl sm:text-3xl font-black tabular-nums font-heading mt-1 text-emerald-700';
            kpiDiffAmount.innerText = '0 đ';
            kpiDiffDesc.className = 'text-xs font-semibold mt-1 text-emerald-700';
            kpiDiffDesc.innerText = 'Khớp đúng 100%';
            if (kpiDiffIcon) kpiDiffIcon.className = 'w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm';
        }
    }
}

// Bấm Quyết toán -> lập Phiếu quyết toán nháp và mở Bảng kê để rà soát / duyệt
function executePageSettlementSubmit() {
    const tripIds = [];
    document.querySelectorAll('.page-settle-checkbox:checked').forEach(cb => {
        const id = parseInt(cb.getAttribute('data-trip-id'), 10);
        if (id) tripIds.push(id);
    });
    openSettlementStatement('DRIVER', tripIds, {
        notes: document.getElementById('page-settle-notes')?.value || '',
        payment_method: document.getElementById('page-settle-payment-method')?.value || 'BANK',
        with_cash: document.getElementById('page-settle-auto-cashbook')?.checked !== false
    });
}

function exportSettlementToExcel() {
    const table = document.getElementById('settlement-trips-table');
    if (!table) {
        showToast('warning', 'Không tìm thấy bảng quyết toán');
        return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF';

    rows.forEach(row => {
        // Bỏ qua dòng checkbox header master hoặc checkbox cells
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach((col, idx) => {
            if (idx === 0 || idx === cols.length - 1) return; // Bỏ cột checkbox và chi tiết
            let text = col.innerText.replace(/"/g, '""').trim();
            text = text.replace(/[\n\r]+/g, ' ');
            rowData.push(`"${text}"`);
        });
        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\r\n';
        }
    });

    const filename = `BIM_Quyet_Toan_Gom_Chuyen_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `Đã xuất bảng kê quyết toán "${filename}" thành công!`, 'Xuất Excel Thành Công');
}
