// =========================================================================
// QUẢN LÝ ĐỘI XE & TÀI XẾ 3PL TRỰC THUỘC ĐỐI TÁC (PHƯƠNG ÁN 3)
// =========================================================================

let subVehiclesCache = {};
let subVehiclesEditingSet = new Set();
let subDriversCache = {};
let subDriversEditingSet = new Set();

// --- 1. Quản lý Phương tiện Thuộc Nhà Xe (3PL) ---
async function loadSubcontractorVehiclesInModal(subId) {
    const tbody = document.getElementById('sub-vehicles-tbody');
    if (!tbody) return;
    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/vehicles/`);
        if (!res.ok) throw new Error('Không thể tải danh sách phương tiện');
        const data = await res.json();
        const vehicles = data.results || [];
        subVehiclesCache[subId] = vehicles;
        renderSubcontractorVehiclesTable(subId);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-rose-500">Lỗi: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function renderSubcontractorVehiclesTable(subId) {
    const tbody = document.getElementById('sub-vehicles-tbody');
    if (!tbody) return;
    const vehicles = subVehiclesCache[subId] || [];
    if (vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-slate-400 italic">Chưa có phương tiện nào gán cho nhà xe này. Bấm "Thêm mới" ở trên.</td></tr>';
        return;
    }
    tbody.innerHTML = vehicles.map(v => {
        const isEditing = subVehiclesEditingSet.has(v.id);
        if (isEditing) {
            const vTypeCode = v.vehicle_type_code || v.vehicle_type || 'TRACTOR';
            return `
                <tr id="subveh-row-${v.id}" class="bg-teal-50/50 border-b border-teal-200 transition-colors">
                    <td class="py-1 px-2">
                        <input type="text" id="edit-subveh-plate-${v.id}" value="${escapeHtml(v.license_plate)}" class="form-input h-7.5 px-2 py-0.5 text-xs font-mono font-bold uppercase w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="Biển số *">
                    </td>
                    <td class="py-1 px-2">
                        <select id="edit-subveh-type-${v.id}" class="form-select h-7.5 px-1.5 py-0.5 text-xs font-semibold w-full rounded border-teal-500 bg-white shadow-2xs">
                            <option value="TRACTOR" ${vTypeCode === 'TRACTOR' || v.vehicle_type === 'Đầu kéo Container' || v.vehicle_type === 'Đầu kéo' ? 'selected' : ''}>Đầu kéo Container</option>
                            <option value="TRUCK_10T" ${vTypeCode === 'TRUCK_10T' || v.vehicle_type === 'Xe tải 10 Tấn' ? 'selected' : ''}>Xe tải 10 Tấn</option>
                            <option value="TRUCK_2T" ${vTypeCode === 'TRUCK_2T' || v.vehicle_type === 'Xe tải 2 Tấn' ? 'selected' : ''}>Xe tải 2 Tấn</option>
                            <option value="VAN" ${vTypeCode === 'VAN' || v.vehicle_type === 'Xe tải nhỏ / Van' ? 'selected' : ''}>Xe tải nhỏ / Van</option>
                        </select>
                    </td>
                    <td class="py-1 px-2">
                        <input type="text" id="edit-subveh-payload-${v.id}" value="${(() => {
                            const disp = (v.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                            if (disp && disp !== '—' && disp !== '-') return disp;
                            if (v.payload_capacity_kg && v.payload_capacity_kg > 0) return formatNumberVN(v.payload_capacity_kg);
                            return '';
                        })()}" class="form-input h-7.5 px-2 py-0.5 text-xs font-mono text-right w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="VD: 30000/27360">
                    </td>
                    <td class="py-1 px-2">
                        <input type="text" id="edit-subveh-brand-${v.id}" value="${escapeHtml(v.brand || '')}" class="form-input h-7.5 px-2 py-0.5 text-xs w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="Hãng / Dòng xe">
                    </td>
                    <td class="py-1 px-2 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="cancelEditSubVehicleRow(${v.id}, ${subId})" class="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer" title="Hủy chỉnh sửa">
                                <i class="ph-bold ph-arrow-u-up-left text-sm"></i>
                            </button>
                            <button type="button" onclick="deleteSubVehicleInline(${v.id}, ${subId})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Gỡ xe">
                                <i class="ph-bold ph-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        return `
            <tr id="subveh-row-${v.id}" class="hover:bg-amber-50/50 transition-colors border-b border-slate-100">
                <td class="py-2 px-3 font-mono font-bold text-slate-900">${escapeHtml(v.license_plate)}</td>
                <td class="py-2 px-3 font-medium text-slate-800">${escapeHtml(v.vehicle_type || '—')}</td>
                <td class="py-2 px-3 font-mono text-slate-700 text-right">${(() => {
                    const disp = (v.payload_display || '').trim().replace(/[-—]+$/, '').trim();
                    if (disp && disp !== '—' && disp !== '-') return `${disp} kg`;
                    if (v.payload_capacity_kg && v.payload_capacity_kg > 0) return `${formatNumberVN(v.payload_capacity_kg)} kg`;
                    return '<span class="text-slate-400 font-normal">—</span>';
                })()}</td>
                <td class="py-2 px-3 text-slate-600">${escapeHtml(v.brand || '—')}</td>
                <td class="py-2 px-2.5 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="editSubVehicleRow(${v.id}, ${subId})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Sửa thông tin xe">
                            <i class="ph-bold ph-pencil-simple text-sm"></i>
                        </button>
                        <button type="button" onclick="deleteSubVehicleInline(${v.id}, ${subId})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Gỡ xe khỏi nhà xe">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    if (typeof initAllNumberInputs === 'function') {
        initAllNumberInputs();
    }
}

function editSubVehicleRow(vehicleId, subId) {
    subVehiclesEditingSet.add(vehicleId);
    renderSubcontractorVehiclesTable(subId);
}

function cancelEditSubVehicleRow(vehicleId, subId) {
    subVehiclesEditingSet.delete(vehicleId);
    renderSubcontractorVehiclesTable(subId);
}

function showAddSubVehicleInline() {
    const row = document.getElementById('sub-vehicle-add-row');
    if (row) {
        row.classList.remove('hidden-view');
        const plateInp = document.getElementById('new-subveh-plate');
        if (plateInp) plateInp.focus();
    }
}

function hideAddSubVehicleInline() {
    const row = document.getElementById('sub-vehicle-add-row');
    if (row) row.classList.add('hidden-view');
}

async function saveNewSubVehicleInline(subId) {
    const plateInp = document.getElementById('new-subveh-plate');
    const typeInp = document.getElementById('new-subveh-type');
    const payloadInp = document.getElementById('new-subveh-payload');
    const brandInp = document.getElementById('new-subveh-brand');

    const license_plate = plateInp ? plateInp.value.trim().toUpperCase() : '';
    const vehicle_type = typeInp ? typeInp.value : 'TRACTOR';
    const payload_capacity_kg = payloadInp ? payloadInp.value : '30.000';
    const brand = brandInp ? brandInp.value.trim() : '';

    if (!license_plate) {
        showToast('warning', 'Vui lòng nhập Biển số xe!');
        if (plateInp) plateInp.focus();
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/vehicles/`, {
            method: 'POST',
            body: JSON.stringify({ license_plate, vehicle_type, payload_capacity_kg, brand })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showToast('success', result.message || `Đã lưu xe [${license_plate}] thành công!`);
            if (plateInp) plateInp.value = '';
            if (brandInp) brandInp.value = '';
            hideAddSubVehicleInline();
            loadSubcontractorVehiclesInModal(subId);
            if (typeof checkAndSyncMasterData === 'function') {
                checkAndSyncMasterData(true);
            } else if (typeof loadMasterDataFormOptions === 'function') {
                loadMasterDataFormOptions(true);
            }
        } else {
            showToast('danger', result.error || 'Không thể lưu phương tiện!');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối máy chủ khi lưu xe!');
    }
}

async function deleteSubVehicleInline(vehicleId, subId) {
    if (!confirm('Bạn có chắc chắn muốn gỡ phương tiện này khỏi nhà xe?')) return;
    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/vehicles/${vehicleId}/`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showToast('success', result.message || 'Đã gỡ phương tiện thành công!');
            subVehiclesEditingSet.delete(vehicleId);
            loadSubcontractorVehiclesInModal(subId);
            if (typeof checkAndSyncMasterData === 'function') {
                checkAndSyncMasterData(true);
            } else if (typeof loadMasterDataFormOptions === 'function') {
                loadMasterDataFormOptions(true);
            }
        } else {
            showToast('danger', result.error || 'Không thể gỡ phương tiện!');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

function toggleVehicleSubcontractorField(val) {
    const el = document.getElementById('div-mdf-subcontractor');
    if (!el) return;
    if (val === 'SUBCONTRACTOR') {
        el.classList.remove('hidden-view');
    } else {
        el.classList.add('hidden-view');
        const sel = document.getElementById('mdf-subcontractor-id');
        if (sel) sel.value = '';
    }
}

function toggleCustomTrailerType(el) {
    const wrap = document.getElementById('mdf-trailer-type-custom-wrap');
    const customInput = document.getElementById('mdf-trailer-type-custom');
    if (!wrap) return;
    if (el && el.value === '__OTHER__') {
        wrap.classList.remove('hidden');
        if (customInput) customInput.focus();
    } else {
        wrap.classList.add('hidden');
    }
}

// --- 2. Quản lý Tài xế Thuộc Nhà Xe (3PL) ---
async function loadSubcontractorDriversInModal(subId) {
    const tbody = document.getElementById('sub-drivers-tbody');
    if (!tbody) return;
    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/drivers/`);
        if (!res.ok) throw new Error('Không thể tải danh sách tài xế 3PL');
        const data = await res.json();
        const drivers = data.results || [];
        subDriversCache[subId] = drivers;
        renderSubcontractorDriversTable(subId);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-rose-500">Lỗi: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function renderSubcontractorDriversTable(subId) {
    const tbody = document.getElementById('sub-drivers-tbody');
    if (!tbody) return;
    const drivers = subDriversCache[subId] || [];
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-slate-400 italic">Chưa có tài xế nào được khai báo cho nhà xe này. Bấm "Thêm mới" ở trên.</td></tr>';
        return;
    }
    tbody.innerHTML = drivers.map(drv => {
        const isEditing = subDriversEditingSet.has(drv.id);
        if (isEditing) {
            return `
                <tr id="subdrv-row-${drv.id}" class="bg-teal-50/50 border-b border-teal-200 transition-colors">
                    <td class="py-1 px-2">
                        <input type="text" id="edit-subdrv-name-${drv.id}" value="${escapeHtml(drv.full_name)}" class="form-input h-7.5 px-2 py-0.5 text-xs font-bold w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="Họ & tên tài xế *">
                    </td>
                    <td class="py-1 px-2">
                        <input type="tel" id="edit-subdrv-phone-${drv.id}" value="${escapeHtml(drv.phone || '')}" class="form-input h-7.5 px-2 py-0.5 text-xs font-mono font-bold text-teal-800 w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="Số điện thoại *">
                    </td>
                    <td class="py-1 px-2">
                        <input type="text" id="edit-subdrv-license-${drv.id}" value="${escapeHtml(drv.license_number || '')}" class="form-input h-7.5 px-2 py-0.5 text-xs font-mono w-full rounded border-teal-500 bg-white shadow-2xs" placeholder="Số GPLX">
                    </td>
                    <td class="py-1 px-2 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button type="button" onclick="cancelEditSubDriverRow(${drv.id}, ${subId})" class="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer" title="Hủy chỉnh sửa">
                                <i class="ph-bold ph-arrow-u-up-left text-sm"></i>
                            </button>
                            <button type="button" onclick="deleteSubDriverInline(${drv.id}, ${subId})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa tài xế">
                                <i class="ph-bold ph-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        return `
            <tr id="subdrv-row-${drv.id}" class="hover:bg-amber-50/50 transition-colors border-b border-slate-100">
                <td class="py-2 px-3 font-bold text-slate-900">${escapeHtml(drv.full_name)}</td>
                <td class="py-2 px-3 font-mono font-bold text-teal-800">${escapeHtml(drv.phone || '—')}</td>
                <td class="py-2 px-3 font-mono text-slate-600">${escapeHtml(drv.license_number || '—')}</td>
                <td class="py-2 px-2.5 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="editSubDriverRow(${drv.id}, ${subId})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer" title="Sửa thông tin tài xế">
                            <i class="ph-bold ph-pencil-simple text-sm"></i>
                        </button>
                        <button type="button" onclick="deleteSubDriverInline(${drv.id}, ${subId})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Xóa tài xế">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function editSubDriverRow(driverId, subId) {
    subDriversEditingSet.add(driverId);
    renderSubcontractorDriversTable(subId);
}

function cancelEditSubDriverRow(driverId, subId) {
    subDriversEditingSet.delete(driverId);
    renderSubcontractorDriversTable(subId);
}

function showAddSubDriverInline() {
    const row = document.getElementById('sub-driver-add-row');
    if (row) {
        row.classList.remove('hidden-view');
        const nameInp = document.getElementById('new-subdrv-name');
        if (nameInp) nameInp.focus();
    }
}

function hideAddSubDriverInline() {
    const row = document.getElementById('sub-driver-add-row');
    if (row) row.classList.add('hidden-view');
}

async function saveNewSubDriverInline(subId) {
    const nameInp = document.getElementById('new-subdrv-name');
    const phoneInp = document.getElementById('new-subdrv-phone');
    const licInp = document.getElementById('new-subdrv-license');

    const full_name = nameInp ? nameInp.value.trim() : '';
    const phone = phoneInp ? phoneInp.value.trim() : '';
    const license_number = licInp ? licInp.value.trim() : '';

    if (!full_name) {
        showToast('warning', 'Vui lòng nhập Họ và tên tài xế!');
        if (nameInp) nameInp.focus();
        return;
    }
    if (!phone) {
        showToast('warning', 'Vui lòng nhập Số điện thoại tài xế!');
        if (phoneInp) phoneInp.focus();
        return;
    }

    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractors/${subId}/drivers/`, {
            method: 'POST',
            body: JSON.stringify({ full_name, phone, license_number, is_active: true })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showToast('success', `Đã thêm tài xế [${full_name}] vào danh bạ đối tác!`);
            if (nameInp) nameInp.value = '';
            if (phoneInp) phoneInp.value = '';
            if (licInp) licInp.value = '';
            hideAddSubDriverInline();
            loadSubcontractorDriversInModal(subId);
            if (typeof checkAndSyncMasterData === 'function') {
                checkAndSyncMasterData(true);
            } else if (typeof loadMasterDataFormOptions === 'function') {
                loadMasterDataFormOptions(true);
            }
        } else {
            showToast('danger', result.error || 'Không thể lưu tài xế!');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối máy chủ khi lưu tài xế!');
    }
}

async function deleteSubDriverInline(driverId, subId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài xế này khỏi danh bạ nhà xe?')) return;
    try {
        const res = await fetchWithAuth(`/api/master-data/subcontractor-drivers/${driverId}/`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (res.ok && result.success) {
            showToast('success', result.message || 'Đã xóa tài xế thành công!');
            subDriversEditingSet.delete(driverId);
            loadSubcontractorDriversInModal(subId);
            if (typeof checkAndSyncMasterData === 'function') {
                checkAndSyncMasterData(true);
            } else if (typeof loadMasterDataFormOptions === 'function') {
                loadMasterDataFormOptions(true);
            }
        } else {
            showToast('danger', result.error || 'Không thể xóa tài xế!');
        }
    } catch (e) {
        showToast('danger', 'Lỗi kết nối máy chủ!');
    }
}

// --- 3. Lưu toàn bộ các dòng đang sửa hoặc thêm mới trên bảng phương tiện & tài xế ---
async function saveAllSubcontractorFleetInlineChanges(subId) {
    if (!subId) return;

    // 1. Cập nhật các dòng xe đang ở trạng thái chỉnh sửa
    if (subVehiclesEditingSet && subVehiclesEditingSet.size > 0) {
        const vIds = Array.from(subVehiclesEditingSet);
        for (const vId of vIds) {
            const plateInp = document.getElementById(`edit-subveh-plate-${vId}`);
            const typeInp = document.getElementById(`edit-subveh-type-${vId}`);
            const payloadInp = document.getElementById(`edit-subveh-payload-${vId}`);
            const brandInp = document.getElementById(`edit-subveh-brand-${vId}`);
            if (plateInp && plateInp.value.trim()) {
                const license_plate = plateInp.value.trim().toUpperCase();
                const vehicle_type = typeInp ? typeInp.value : 'TRACTOR';
                const payload_capacity_kg = payloadInp ? payloadInp.value : '30.000';
                const brand = brandInp ? brandInp.value.trim() : '';
                try {
                    await fetchWithAuth(`/api/master-data/subcontractors/${subId}/vehicles/${vId}/`, {
                        method: 'PUT',
                        body: JSON.stringify({ license_plate, vehicle_type, payload_capacity_kg, brand })
                    });
                } catch (e) {
                    console.error(`Lỗi cập nhật xe [${vId}]:`, e);
                }
            }
        }
        subVehiclesEditingSet.clear();
    }

    // 2. Thêm xe mới nếu form inline đang có dữ liệu
    const newPlateInp = document.getElementById('new-subveh-plate');
    if (newPlateInp && newPlateInp.value.trim()) {
        const license_plate = newPlateInp.value.trim().toUpperCase();
        const vehicle_type = document.getElementById('new-subveh-type')?.value || 'TRACTOR';
        const payload_capacity_kg = document.getElementById('new-subveh-payload')?.value || '30.000';
        const brand = document.getElementById('new-subveh-brand')?.value.trim() || '';
        try {
            await fetchWithAuth(`/api/master-data/subcontractors/${subId}/vehicles/`, {
                method: 'POST',
                body: JSON.stringify({ license_plate, vehicle_type, payload_capacity_kg, brand })
            });
            newPlateInp.value = '';
            if (document.getElementById('new-subveh-brand')) document.getElementById('new-subveh-brand').value = '';
            hideAddSubVehicleInline();
        } catch (e) {
            console.error('Lỗi lưu thêm mới xe:', e);
        }
    }

    // 3. Cập nhật các dòng tài xế đang ở trạng thái chỉnh sửa
    if (subDriversEditingSet && subDriversEditingSet.size > 0) {
        const drvIds = Array.from(subDriversEditingSet);
        for (const drvId of drvIds) {
            const nameInp = document.getElementById(`edit-subdrv-name-${drvId}`);
            const phoneInp = document.getElementById(`edit-subdrv-phone-${drvId}`);
            const licInp = document.getElementById(`edit-subdrv-license-${drvId}`);
            if (nameInp && nameInp.value.trim()) {
                const full_name = nameInp.value.trim();
                const phone = phoneInp ? phoneInp.value.trim() : '';
                const license_number = licInp ? licInp.value.trim() : '';
                try {
                    await fetchWithAuth(`/api/master-data/subcontractor-drivers/${drvId}/`, {
                        method: 'PUT',
                        body: JSON.stringify({ full_name, phone, license_number })
                    });
                } catch (e) {
                    console.error(`Lỗi cập nhật tài xế [${drvId}]:`, e);
                }
            }
        }
        subDriversEditingSet.clear();
    }

    // 4. Thêm tài xế mới nếu form inline đang có dữ liệu
    const newDrvNameInp = document.getElementById('new-subdrv-name');
    if (newDrvNameInp && newDrvNameInp.value.trim()) {
        const full_name = newDrvNameInp.value.trim();
        const phone = document.getElementById('new-subdrv-phone')?.value.trim() || '';
        const license_number = document.getElementById('new-subdrv-license')?.value.trim() || '';
        try {
            await fetchWithAuth(`/api/master-data/subcontractors/${subId}/drivers/`, {
                method: 'POST',
                body: JSON.stringify({ full_name, phone, license_number, is_active: true })
            });
            newDrvNameInp.value = '';
            if (document.getElementById('new-subdrv-phone')) document.getElementById('new-subdrv-phone').value = '';
            if (document.getElementById('new-subdrv-license')) document.getElementById('new-subdrv-license').value = '';
            hideAddSubDriverInline();
        } catch (e) {
            console.error('Lỗi lưu thêm mới tài xế:', e);
        }
    }

    // Tải lại danh mục cho các dropdown & đồng bộ tức thời
    if (typeof checkAndSyncMasterData === 'function') {
        checkAndSyncMasterData(true);
    } else if (typeof loadMasterDataFormOptions === 'function') {
        loadMasterDataFormOptions(true);
    }
}

async function openSubcontractorFleetModal(subId) {
    await openEditMasterDataModal(subId);
    setTimeout(() => {
        const sec = document.getElementById('section-subcontractor-vehicles-mgmt') || document.getElementById('section-subcontractor-drivers-mgmt');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
}

// Window bindings
window.loadSubcontractorVehiclesInModal = typeof loadSubcontractorVehiclesInModal !== 'undefined' ? loadSubcontractorVehiclesInModal : undefined;
window.renderSubcontractorVehiclesTable = typeof renderSubcontractorVehiclesTable !== 'undefined' ? renderSubcontractorVehiclesTable : undefined;
window.editSubVehicleRow = typeof editSubVehicleRow !== 'undefined' ? editSubVehicleRow : undefined;
window.cancelEditSubVehicleRow = typeof cancelEditSubVehicleRow !== 'undefined' ? cancelEditSubVehicleRow : undefined;
window.showAddSubVehicleInline = typeof showAddSubVehicleInline !== 'undefined' ? showAddSubVehicleInline : undefined;
window.hideAddSubVehicleInline = typeof hideAddSubVehicleInline !== 'undefined' ? hideAddSubVehicleInline : undefined;
window.saveNewSubVehicleInline = typeof saveNewSubVehicleInline !== 'undefined' ? saveNewSubVehicleInline : undefined;
window.deleteSubVehicleInline = typeof deleteSubVehicleInline !== 'undefined' ? deleteSubVehicleInline : undefined;
window.toggleVehicleSubcontractorField = typeof toggleVehicleSubcontractorField !== 'undefined' ? toggleVehicleSubcontractorField : undefined;
window.toggleCustomTrailerType = typeof toggleCustomTrailerType !== 'undefined' ? toggleCustomTrailerType : undefined;
window.loadSubcontractorDriversInModal = typeof loadSubcontractorDriversInModal !== 'undefined' ? loadSubcontractorDriversInModal : undefined;
window.renderSubcontractorDriversTable = typeof renderSubcontractorDriversTable !== 'undefined' ? renderSubcontractorDriversTable : undefined;
window.editSubDriverRow = typeof editSubDriverRow !== 'undefined' ? editSubDriverRow : undefined;
window.cancelEditSubDriverRow = typeof cancelEditSubDriverRow !== 'undefined' ? cancelEditSubDriverRow : undefined;
window.showAddSubDriverInline = typeof showAddSubDriverInline !== 'undefined' ? showAddSubDriverInline : undefined;
window.hideAddSubDriverInline = typeof hideAddSubDriverInline !== 'undefined' ? hideAddSubDriverInline : undefined;
window.saveNewSubDriverInline = typeof saveNewSubDriverInline !== 'undefined' ? saveNewSubDriverInline : undefined;
window.deleteSubDriverInline = typeof deleteSubDriverInline !== 'undefined' ? deleteSubDriverInline : undefined;
window.saveAllSubcontractorFleetInlineChanges = typeof saveAllSubcontractorFleetInlineChanges !== 'undefined' ? saveAllSubcontractorFleetInlineChanges : undefined;
window.openSubcontractorFleetModal = typeof openSubcontractorFleetModal !== 'undefined' ? openSubcontractorFleetModal : undefined;
