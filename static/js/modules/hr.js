/**
 * BIM LOGISTICS — MODULE HÀNH CHÍNH & NHÂN SỰ (HR & PAYROLL)
 */

// --- 6. PHÂN HỆ HÀNH CHÍNH & NHÂN SỰ (EMPLOYEE DIRECTORY & PAYROLL) ---
let currentHRSubTab = 'directory';
let rawEmployeesList = [];
let rawHRData = [];
let hrSortColumn = null;
let hrSortDirection = 'asc';

function switchHRSubTab(tabKey) {
    currentHRSubTab = tabKey;
    const dirBtn = document.getElementById('hr-tab-directory-btn');
    const payBtn = document.getElementById('hr-tab-payroll-btn');
    const dirPanel = document.getElementById('hr-panel-directory');
    const payPanel = document.getElementById('hr-panel-payroll');
    const createBtn = document.getElementById('btn-create-employee');

    if (tabKey === 'directory') {
        if (dirBtn) {
            dirBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
            dirBtn.classList.remove('border-transparent', 'text-slate-500');
        }
        if (payBtn) {
            payBtn.classList.remove('active', 'border-teal-600', 'text-teal-800');
            payBtn.classList.add('border-transparent', 'text-slate-500');
        }
        if (dirPanel) dirPanel.classList.remove('hidden');
        if (payPanel) payPanel.classList.add('hidden');
        if (createBtn) createBtn.classList.remove('hidden');
        loadEmployeesData();
    } else {
        if (payBtn) {
            payBtn.classList.add('active', 'border-teal-600', 'text-teal-800');
            payBtn.classList.remove('border-transparent', 'text-slate-500');
        }
        if (dirBtn) {
            dirBtn.classList.remove('active', 'border-teal-600', 'text-teal-800');
            dirBtn.classList.add('border-transparent', 'text-slate-500');
        }
        if (payPanel) payPanel.classList.remove('hidden');
        if (dirPanel) dirPanel.classList.add('hidden');
        if (createBtn) createBtn.classList.add('hidden');
        loadHRPayrollData();
    }
}

async function loadEmployeesData() {
    try {
        const [empRes, statsRes] = await Promise.all([
            fetchWithAuth('/api/personnel/employees/'),
            fetchWithAuth('/api/personnel/stats/')
        ]);

        if (statsRes.ok) {
            const statsJson = await statsRes.json();
            const s = statsJson.stats || {};
            const el = id => document.getElementById(id);
            if (el('hr-kpi-total')) el('hr-kpi-total').innerText = s.total || 0;
            if (el('hr-kpi-drivers')) el('hr-kpi-drivers').innerText = s.drivers || 0;
            if (el('hr-kpi-office')) el('hr-kpi-office').innerText = (s.dispatchers || 0) + (s.accountants || 0);
            if (el('hr-kpi-inactive')) el('hr-kpi-inactive').innerText = s.inactive || 0;
        }

        if (empRes.ok) {
            const empJson = await empRes.json();
            rawEmployeesList = empJson.results || [];
            filterEmployeesTable();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách nhân sự:', err);
    }
}

function filterEmployeesTable() {
    const q = (document.getElementById('emp-search-input')?.value || '').trim().toLowerCase();
    const dept = document.getElementById('emp-filter-dept')?.value || 'ALL';
    const role = document.getElementById('emp-filter-role')?.value || 'ALL';
    const status = document.getElementById('emp-filter-status')?.value || 'ALL';

    const filtered = (rawEmployeesList || []).filter(item => {
        // Match Search Text
        const str = `${item.code} ${item.full_name} ${item.nickname || ''} ${item.phone_number || ''} ${item.license_number || ''}`.toLowerCase();
        const matchesQuery = !q || str.includes(q);

        // Match Filters
        const matchesDept = dept === 'ALL' || item.department === dept;
        const matchesRole = role === 'ALL' || item.role === role;
        const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? item.is_active : !item.is_active);

        return matchesQuery && matchesDept && matchesRole && matchesStatus;
    });

    const countDisplay = document.getElementById('emp-count-display');
    if (countDisplay) countDisplay.innerText = filtered.length;

    renderEmployeesTable(filtered);
}

function renderEmployeesTable(items) {
    const tbody = document.getElementById('employees-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-user-circle text-3xl mb-2 text-slate-300 block"></i>
                    Không tìm thấy nhân sự nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(emp => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
            <td class="py-2.5 px-3.5 font-mono font-bold text-teal-900 border-r border-slate-200 text-xs">${escapeHtml(emp.code)}</td>
            <td class="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200 text-sm">
                <div>${escapeHtml(emp.full_name)}</div>
                ${emp.username ? `<div class="text-[11px] text-slate-400 font-normal">@${escapeHtml(emp.username)}</div>` : ''}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-semibold text-slate-700 border-r border-slate-200">${emp.nickname ? `<span class="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">${escapeHtml(emp.nickname)}</span>` : '—'}</td>
            <td class="py-2.5 px-3.5 text-xs border-r border-slate-200 font-mono">
                <div class="font-bold text-slate-800">${escapeHtml(emp.phone_number || '—')}</div>
                ${emp.zalo_id ? `<div class="text-[11px] text-teal-600 font-medium">Zalo: ${escapeHtml(emp.zalo_id)}</div>` : ''}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-medium text-slate-700 border-r border-slate-200">${escapeHtml(emp.department_label || emp.department)}</td>
            <td class="py-2.5 px-3.5 text-xs font-bold border-r border-slate-200">
                <span class="px-2 py-0.5 rounded-md ${emp.role === 'DRIVER' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : (emp.role === 'DIRECTOR' ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-blue-800 border border-blue-200')}">
                    ${escapeHtml(emp.role_label || emp.role)}
                </span>
            </td>
            <td class="py-2.5 px-3.5 text-xs border-r border-slate-200">
                ${emp.license_number ? `
                    <div class="font-mono font-bold text-slate-800">${escapeHtml(emp.license_number)}</div>
                    ${emp.license_expiry ? `<div class="text-[11px] text-slate-500">Hạn: ${emp.license_expiry}</div>` : ''}
                ` : '<span class="text-slate-400">—</span>'}
            </td>
            <td class="py-2.5 px-3.5 text-xs font-mono font-bold text-right text-slate-900 border-r border-slate-200 tabular-nums">${formatMoney(emp.base_salary)}</td>
            <td class="py-2.5 px-3.5 text-center border-r border-slate-200 text-xs font-semibold ${emp.is_active ? 'text-emerald-700' : 'text-slate-400'}">
                ${emp.is_active ? '<span class="inline-flex items-center gap-1 text-emerald-700 font-bold"><i class="ph-fill ph-check-circle text-sm"></i> Đang làm</span>' : '<span class="inline-flex items-center gap-1 text-slate-400"><i class="ph-fill ph-minus-circle text-sm"></i> Tạm ngưng</span>'}
            </td>
            <td class="py-2.5 px-3.5 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <button onclick="openEditEmployeeModal(${emp.id})" class="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer" title="Chỉnh sửa hồ sơ"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                    <button onclick="deleteEmployeeItem(${emp.id})" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Tạm ngưng công tác"><i class="ph-bold ph-user-minus text-sm"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function handleEmployeeRoleChange() {
    const roleSelect = document.getElementById('emp-role');
    const driverFields = document.getElementById('emp-driver-fields');
    if (roleSelect && driverFields) {
        if (roleSelect.value === 'DRIVER') {
            driverFields.classList.remove('hidden');
        } else {
            driverFields.classList.add('hidden');
        }
    }
}

function openCreateEmployeeModal() {
    document.getElementById('emp-edit-id').value = '';
    document.getElementById('emp-modal-title').innerText = 'Khai Báo Nhân Sự Mới';
    document.getElementById('emp-modal-subtitle').innerText = 'Thêm mới nhân viên, tài xế vào danh bạ BIM Logistics';

    document.getElementById('emp-code').value = '';
    document.getElementById('emp-full-name').value = '';
    document.getElementById('emp-nickname').value = '';
    document.getElementById('emp-phone').value = '';
    document.getElementById('emp-zalo').value = '';
    document.getElementById('emp-department').value = 'FLEET';
    document.getElementById('emp-role').value = 'DRIVER';
    document.getElementById('emp-license-number').value = '';
    document.getElementById('emp-license-expiry').value = '';
    document.getElementById('emp-base-salary').value = '5,000,000';
    document.getElementById('emp-is-active').value = 'true';

    handleEmployeeRoleChange();
    document.getElementById('modal-employee').classList.remove('hidden');
}

function openEditEmployeeModal(id) {
    const emp = (rawEmployeesList || []).find(e => e.id === id);
    if (!emp) return;

    document.getElementById('emp-edit-id').value = id;
    document.getElementById('emp-modal-title').innerText = 'Chỉnh Sửa Hồ Sơ Nhân Sự';
    document.getElementById('emp-modal-subtitle').innerText = `ID #${id} • Cập nhật thông tin cán bộ / tài xế`;

    document.getElementById('emp-code').value = emp.code || '';
    document.getElementById('emp-full-name').value = emp.full_name || '';
    document.getElementById('emp-nickname').value = emp.nickname || '';
    document.getElementById('emp-phone').value = emp.phone_number || '';
    document.getElementById('emp-zalo').value = emp.zalo_id || '';
    document.getElementById('emp-department').value = emp.department || 'FLEET';
    document.getElementById('emp-role').value = emp.role || 'DRIVER';
    document.getElementById('emp-license-number').value = emp.license_number || '';
    document.getElementById('emp-license-expiry').value = emp.license_expiry || '';
    document.getElementById('emp-base-salary').value = new Intl.NumberFormat('vi-VN').format(emp.base_salary || 0);
    document.getElementById('emp-is-active').value = emp.is_active ? 'true' : 'false';

    handleEmployeeRoleChange();
    document.getElementById('modal-employee').classList.remove('hidden');
}

function closeEmployeeModal() {
    const modal = document.getElementById('modal-employee');
    if (modal) modal.classList.add('hidden');
}

async function submitEmployeeForm(event) {
    event.preventDefault();
    const editId = document.getElementById('emp-edit-id').value;
    const isEdit = Boolean(editId);

    const baseSalaryClean = String(document.getElementById('emp-base-salary').value || '0').replace(/\D/g, '');

    const payload = {
        code: document.getElementById('emp-code').value.trim().toUpperCase(),
        full_name: document.getElementById('emp-full-name').value.trim(),
        nickname: document.getElementById('emp-nickname').value.trim(),
        phone_number: document.getElementById('emp-phone').value.trim(),
        zalo_id: document.getElementById('emp-zalo').value.trim(),
        department: document.getElementById('emp-department').value,
        role: document.getElementById('emp-role').value,
        license_number: document.getElementById('emp-license-number').value.trim(),
        license_expiry: document.getElementById('emp-license-expiry').value || null,
        base_salary: parseInt(baseSalaryClean, 10) || 0,
        is_active: document.getElementById('emp-is-active').value === 'true'
    };

    const url = isEdit ? `/api/personnel/employees/${editId}/` : '/api/personnel/employees/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            const errStr = data.errors ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join('; ') : (data.message || 'Lỗi lưu hồ sơ');
            throw new Error(errStr);
        }

        if (typeof showToast === 'function') {
            showToast('success', data.message || 'Đã lưu hồ sơ nhân sự thành công!', 'Thành Công');
        }
        closeEmployeeModal();
        loadEmployeesData();
    } catch (err) {
        console.error('Lỗi gửi form nhân sự:', err);
        if (typeof showToast === 'function') {
            showToast('error', err.message || 'Không thể lưu hồ sơ.', 'Lỗi Khai Báo');
        } else {
            alert('Lỗi: ' + err.message);
        }
    }
}

async function deleteEmployeeItem(id) {
    const confirmed = await showConfirmModal({
        title: 'Tạm Ngưng Nhân Sự',
        message: 'Bạn có chắc chắn muốn chuyển nhân sự này sang trạng thái tạm ngưng công tác?\n\nDữ liệu lịch sử phân công và bảng lương vẫn được bảo lưu an toàn.',
        confirmText: 'Tạm Ngưng',
        cancelText: 'Huỷ bỏ',
        type: 'danger',
        icon: 'ph-bold ph-user-minus text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/personnel/employees/${id}/`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (typeof showToast === 'function') {
            showToast('success', data.message || 'Đã cập nhật trạng thái nhân sự!', 'Thành Công');
        }
        loadEmployeesData();
    } catch (err) {
        console.error('Lỗi tạm ngưng nhân sự:', err);
    }
}

async function loadHRPayrollData() {
    try {
        const globalDates = getDateRangeForPeriod(currentDashboardPeriod, currentDashboardCustomStart, currentDashboardCustomEnd);
        const res = await fetchWithAuth(`/api/personnel/payroll/?from_date=${globalDates.fromDate}&to_date=${globalDates.toDate}`);
        if (!res.ok) throw new Error('Lỗi tải bảng lương');
        const data = await res.json();
        rawHRData = data || [];
        applyHRFilters();
    } catch (err) {
        console.error('Lỗi tải bảng lương HR:', err);
    }
}

async function loadHRData() {
    if (currentHRSubTab === 'directory') {
        loadEmployeesData();
    } else {
        loadHRPayrollData();
    }
}

function toggleHRSort(col) {
    if (hrSortColumn === col) {
        hrSortDirection = hrSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        hrSortColumn = col;
        hrSortDirection = 'asc';
    }
    applyHRFilters();
}

function clearHRSearch() {
    const input = document.getElementById('filter-hr-search');
    if (input) input.value = '';
    applyHRFilters();
}

function resetHRFilters() {
    const input = document.getElementById('filter-hr-search');
    if (input) input.value = '';
    hrSortColumn = null;
    hrSortDirection = 'asc';
    applyHRFilters();
}

function applyHRFilters() {
    if (!rawHRData || !Array.isArray(rawHRData)) return;

    const filterSearch = document.getElementById('filter-hr-search')?.value?.trim().toLowerCase() || '';
    const clearBtn = document.getElementById('btn-clear-hr-search');
    if (clearBtn) {
        if (filterSearch) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    let list = rawHRData.filter(item => {
        if (filterSearch) {
            const combinedText = [
                item.code,
                item.name
            ].filter(Boolean).join(' ').toLowerCase();
            if (!combinedText.includes(filterSearch)) return false;
        }
        return true;
    });

    const filteredCountEl = document.getElementById('hr-filtered-count');
    if (filteredCountEl) filteredCountEl.innerText = list.length;
    const totalCountEl = document.getElementById('hr-total-count');
    if (totalCountEl) totalCountEl.innerText = rawHRData.length;

    // Cập nhật trạng thái hiển thị của các icon sắp xếp cột
    const sortKeys = ['code', 'name', 'trips', 'base_salary', 'trip_salary', 'advance', 'net_salary'];
    sortKeys.forEach(k => {
        const icon = document.getElementById(`sort-icon-hr-${k}`);
        if (icon) {
            if (hrSortColumn === k) {
                icon.className = hrSortDirection === 'asc' 
                    ? 'ph-bold ph-arrow-up text-teal-600 text-xs' 
                    : 'ph-bold ph-arrow-down text-teal-600 text-xs';
            } else {
                icon.className = 'ph-bold ph-arrows-down-up text-slate-400 text-xs';
            }
        }
    });

    if (hrSortColumn) {
        list.sort((a, b) => {
            let valA = a[hrSortColumn];
            let valB = b[hrSortColumn];
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string') {
                return hrSortDirection === 'asc'
                    ? valA.localeCompare(valB, 'vi')
                    : valB.localeCompare(valA, 'vi');
            } else {
                return hrSortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            }
        });
    }

    renderHRPayrollTable(list);
}

function renderHRPayrollTable(items) {
    const tbody = document.getElementById('hr-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-receipt text-3xl mb-2 text-slate-300 block"></i>
                    Không có dữ liệu lương chuyến trong kỳ đã chọn.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
            <td class="py-2.5 px-3.5 font-mono font-bold text-teal-900 border-r border-slate-200 text-xs">${escapeHtml(item.code || '')}</td>
            <td class="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200 text-sm">${escapeHtml(item.name || '')}</td>
            <td class="py-2.5 px-3.5 text-center font-bold text-slate-800 border-r border-slate-200 text-xs">
                <span class="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">${item.trips || 0}</span>
            </td>
            <td class="py-2.5 px-3.5 text-right font-mono text-xs font-semibold text-slate-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(item.base_salary || 0)} đ</td>
            <td class="py-2.5 px-3.5 text-right font-mono text-xs font-bold text-teal-700 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(item.trip_salary || 0)} đ</td>
            <td class="py-2.5 px-3.5 text-right font-mono text-xs font-semibold text-rose-600 border-r border-slate-200">${new Intl.NumberFormat('vi-VN').format(item.advance || 0)} đ</td>
            <td class="py-2.5 px-3.5 text-right font-mono text-xs font-bold text-emerald-700">${new Intl.NumberFormat('vi-VN').format(item.net_salary || 0)} đ</td>
        </tr>
    `).join('');
    
    // Tự động đồng bộ ẩn/hiện cột nếu ColumnManager đang hoạt động
    if (window.BimTableColumnManager && typeof window.BimTableColumnManager.instances === 'object') {
        const mgr = window.BimTableColumnManager.instances['personnel-payroll-table'];
        if (mgr && typeof mgr.apply === 'function') {
            mgr.apply();
        }
    }
}

