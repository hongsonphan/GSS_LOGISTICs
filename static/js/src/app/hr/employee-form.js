const DEPARTMENT_POSITIONS = {
    'MANAGEMENT': [
        { value: 'DIRECTOR', label: 'Giám Đốc' }
    ],
    'ADMIN_ACC': [
        { value: 'LEAD_ADMIN_ACC', label: 'Chuyên viên Phụ trách' },
        { value: 'STAFF_ADMIN_ACC', label: 'Nhân viên' }
    ],
    'DISPATCH': [
        { value: 'LEAD_DISPATCH', label: 'Chuyên viên Phụ trách' },
        { value: 'DISPATCHER', label: 'Nhân viên Điều vận' },
        { value: 'DISPATCH_ASST', label: 'Nhân viên Hỗ trợ' },
        { value: 'DRIVER', label: 'Tài xế & Giao nhận' }
    ],
    'SALES': [
        { value: 'LEAD_SALES', label: 'Chuyên viên Phụ trách' },
        { value: 'SALESMAN', label: 'Nhân viên Kinh doanh' },
        { value: 'CSKH', label: 'Admin / CSKH' }
    ],
    'MAINTENANCE': [
        { value: 'LEAD_MAINT', label: 'Chuyên viên Phụ trách' },
        { value: 'MECHANIC', label: 'Nhân viên Bảo trì' }
    ],
    'CUSTOMS': [
        { value: 'LEAD_CUSTOMS', label: 'Chuyên viên Phụ trách' },
        { value: 'CUSTOMS_STAFF', label: 'Nhân viên xử lý' }
    ],
    'FLEET': [
        { value: 'DRIVER', label: 'Tài xế & Giao nhận' },
        { value: 'LEAD_MAINT', label: 'Chuyên viên Phụ trách' },
        { value: 'MECHANIC', label: 'Nhân viên Bảo trì' }
    ],
    'ACCOUNTING': [
        { value: 'LEAD_ADMIN_ACC', label: 'Chuyên viên Phụ trách' },
        { value: 'STAFF_ADMIN_ACC', label: 'Nhân viên' },
        { value: 'ACCOUNTANT', label: 'Kế toán viên' }
    ],
    'HR': [
        { value: 'LEAD_ADMIN_ACC', label: 'Chuyên viên Phụ trách' },
        { value: 'STAFF_ADMIN_ACC', label: 'Nhân viên' }
    ]
};
window.DEPARTMENT_POSITIONS = DEPARTMENT_POSITIONS;

function handleEmployeeDeptChange(deptVal, selectedRole = null) {
    const roleSelect = document.getElementById('emp-role');
    if (!roleSelect) return;
    const positions = DEPARTMENT_POSITIONS[deptVal] || [];
    if (positions.length > 0) {
        roleSelect.innerHTML = positions.map(p => `<option value="${p.value}">${p.label} (${p.value})</option>`).join('');
        if (selectedRole && positions.some(p => p.value === selectedRole)) {
            roleSelect.value = selectedRole;
        } else {
            roleSelect.value = positions[0].value;
        }
    }
    handleEmployeeRoleChange();
}
window.handleEmployeeDeptChange = handleEmployeeDeptChange;

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
window.handleEmployeeRoleChange = handleEmployeeRoleChange;

async function loadAvailableUsers(currentEmpId = null, selectedUserId = null) {
    const select = document.getElementById('emp-user-id');
    const hintText = document.getElementById('emp-user-hint-text');
    if (!select) return;

    try {
        const res = await fetchWithAuth('/api/personnel/users-available/');
        if (!res.ok) return;
        const json = await res.json();
        const users = json.results || [];

        let html = '<option value="">-- Không liên kết tài khoản --</option>';
        users.forEach(u => {
            const isAssignedOther = u.assigned_to_id && String(u.assigned_to_id) !== String(currentEmpId);
            const isSelected = selectedUserId && String(u.id) === String(selectedUserId);
            let label = `${u.username} (${u.full_name || u.email || 'User'})`;
            if (isAssignedOther) {
                label += ` [Đang gán: ${u.assigned_to_code} - ${u.assigned_to_name}]`;
            }
            const disabledAttr = isAssignedOther ? 'disabled class="text-slate-400 bg-slate-100"' : '';
            html += `<option value="${u.id}" ${isSelected ? 'selected' : ''} ${disabledAttr}>${escapeHtml(label)}</option>`;
        });
        select.innerHTML = html;

        if (selectedUserId) {
            select.value = String(selectedUserId);
        }

        const updateHint = () => {
            const val = select.value;
            if (!hintText) return;
            if (!val) {
                hintText.innerHTML = '<span class="text-slate-400">Chưa liên kết tài khoản đăng nhập cho nhân sự này.</span>';
                return;
            }
            const selectedUser = users.find(u => String(u.id) === String(val));
            if (selectedUser) {
                hintText.innerHTML = `<span class="text-teal-700 font-bold flex items-center gap-1"><i class="ph-bold ph-check-circle text-teal-600"></i><span>Tài khoản: <b>${escapeHtml(selectedUser.username)}</b> (${escapeHtml(selectedUser.full_name || selectedUser.email)})</span></span>`;
            }
        };

        select.onchange = updateHint;
        updateHint();
    } catch (e) {
        console.error('Lỗi nạp danh sách tài khoản:', e);
    }
}
window.loadAvailableUsers = loadAvailableUsers;

function openCreateEmployeePage(updateHistory = true) {
    const form = document.getElementById('form-employee');
    if (form) form.reset();
    document.getElementById('emp-edit-id').value = '';

    const el = id => document.getElementById(id);
    if (el('emp-code')) el('emp-code').value = '';
    if (el('emp-full-name')) el('emp-full-name').value = '';
    if (el('emp-nickname')) el('emp-nickname').value = '';
    if (el('emp-phone')) el('emp-phone').value = '';
    if (el('emp-zalo')) el('emp-zalo').value = '';
    if (el('emp-email')) el('emp-email').value = '';
    if (el('emp-department')) el('emp-department').value = 'DISPATCH';
    handleEmployeeDeptChange('DISPATCH', 'DRIVER');
    if (el('emp-role')) el('emp-role').value = 'DRIVER';
    if (el('emp-gender')) el('emp-gender').value = 'MALE';
    if (el('emp-dob')) el('emp-dob').value = '';
    if (el('emp-national-id')) el('emp-national-id').value = '';
    if (el('emp-national-id-date')) el('emp-national-id-date').value = '';
    if (el('emp-national-id-place')) el('emp-national-id-place').value = '';
    if (el('emp-tax-id')) el('emp-tax-id').value = '';
    if (el('emp-insurance-number')) el('emp-insurance-number').value = '';
    if (el('emp-bank-account')) el('emp-bank-account').value = '';
    if (el('emp-bank-name')) el('emp-bank-name').value = '';
    if (el('emp-bank-beneficiary')) el('emp-bank-beneficiary').value = '';
    if (el('emp-join-date')) el('emp-join-date').value = '';
    if (el('emp-license-number')) el('emp-license-number').value = '';
    if (el('emp-license-expiry')) el('emp-license-expiry').value = '';
    if (el('emp-is-active')) el('emp-is-active').value = 'true';
    if (el('emp-permanent-address')) el('emp-permanent-address').value = '';
    if (el('emp-current-address')) el('emp-current-address').value = '';

    handleEmployeeRoleChange();
    loadAvailableUsers(null, null);


    if (updateHistory && window.history && window.history.pushState) {
        const path = '/personnel/employees/new';
        if (window.location.pathname !== path) {
            window.history.pushState({ view: 'employee-form' }, '', path);
        }
    }

    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-employee-form') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const formView = document.getElementById('view-employee-form');
    if (formView) {
        formView.classList.remove('hidden-view');
        formView.scrollTop = 0;
        const innerScroll = formView.querySelector('.overflow-y-auto');
        if (innerScroll) innerScroll.scrollTop = 0;
    }

    setEmployeeFormReadOnly(false);
    const delBtn = document.getElementById('btn-employee-delete-bottom');
    if (delBtn) delBtn.classList.add('hidden');
    const printBtn = document.getElementById('btn-employee-print-bottom');
    if (printBtn) printBtn.classList.add('hidden');
    const editBtn = document.getElementById('btn-employee-edit-bottom');
    if (editBtn) editBtn.classList.add('hidden');
    const submitBtnText = document.getElementById('emp-submit-btn-text');
    if (submitBtnText) submitBtnText.innerText = 'Lưu';

    setTopbarFullpageMode({
        backFn: backToPersonnel,
        prefix: 'Hành Chính & Nhân Sự',
        title: 'Tạo Mới Nhân Sự',
        subText: '',
        badgesHtml: '',
        actionsHtml: ''
    });
}
window.openCreateEmployeePage = openCreateEmployeePage;
window.openCreateEmployeeModal = openCreateEmployeePage;

async function openEditEmployeePage(id, updateHistory = true) {
    let emp = (rawEmployeesList || []).find(e => String(e.id) === String(id));
    if (!emp) {
        await loadEmployeesData();
        emp = (rawEmployeesList || []).find(e => String(e.id) === String(id));
    }
    if (!emp) return;

    document.getElementById('emp-edit-id').value = emp.id;
    const el = id_ => document.getElementById(id_);
    if (el('emp-code')) el('emp-code').value = emp.code || '';
    if (el('emp-full-name')) el('emp-full-name').value = emp.full_name || '';
    if (el('emp-nickname')) el('emp-nickname').value = emp.nickname || '';
    if (el('emp-phone')) el('emp-phone').value = emp.phone_number || '';
    if (el('emp-zalo')) el('emp-zalo').value = emp.zalo_id || '';
    if (el('emp-email')) el('emp-email').value = emp.email || '';
    const curEmpDept = emp.department || 'DISPATCH';
    if (el('emp-department')) el('emp-department').value = curEmpDept;
    handleEmployeeDeptChange(curEmpDept, emp.role || 'DRIVER');
    if (el('emp-role')) el('emp-role').value = emp.role || 'DRIVER';
    if (el('emp-gender')) el('emp-gender').value = emp.gender || 'MALE';
    if (el('emp-dob')) el('emp-dob').value = normalizeDateToISO(emp.date_of_birth) || '';
    if (el('emp-national-id')) el('emp-national-id').value = emp.national_id || '';
    if (el('emp-national-id-date')) el('emp-national-id-date').value = normalizeDateToISO(emp.national_id_date) || '';
    if (el('emp-national-id-place')) el('emp-national-id-place').value = emp.national_id_place || '';
    if (el('emp-tax-id')) el('emp-tax-id').value = emp.tax_id || '';
    if (el('emp-insurance-number')) el('emp-insurance-number').value = emp.insurance_number || '';
    if (el('emp-bank-account')) el('emp-bank-account').value = emp.bank_account || '';
    if (el('emp-bank-name')) el('emp-bank-name').value = emp.bank_name || '';
    if (el('emp-bank-beneficiary')) el('emp-bank-beneficiary').value = emp.bank_beneficiary || '';
    if (el('emp-join-date')) el('emp-join-date').value = normalizeDateToISO(emp.join_date) || '';
    if (el('emp-resign-date')) el('emp-resign-date').value = normalizeDateToISO(emp.resign_date) || '';
    if (el('emp-license-number')) el('emp-license-number').value = emp.license_number || '';
    if (el('emp-license-expiry')) el('emp-license-expiry').value = normalizeDateToISO(emp.license_expiry) || '';
    if (el('emp-is-active')) el('emp-is-active').value = emp.is_active ? 'true' : 'false';
    if (el('emp-permanent-address')) el('emp-permanent-address').value = emp.permanent_address || '';
    if (el('emp-current-address')) el('emp-current-address').value = emp.current_address || '';

    handleEmployeeRoleChange();
    loadAvailableUsers(emp.id, emp.user);

    if (updateHistory && window.history && window.history.pushState) {
        const path = `/personnel/employees/${emp.id}`;
        if (window.location.pathname !== path) {
            window.history.pushState({ view: 'employee-form', employeeId: emp.id }, '', path);
        }
    }

    const currentActiveView = document.querySelector('.view:not(.hidden-view)');
    if (currentActiveView && currentActiveView.id !== 'view-employee-form') {
        previousActiveTab = currentActiveView.id.replace('view-', '');
    }

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const formView = document.getElementById('view-employee-form');
    if (formView) {
        formView.classList.remove('hidden-view');
        formView.scrollTop = 0;
        const innerScroll = formView.querySelector('.overflow-y-auto');
        if (innerScroll) innerScroll.scrollTop = 0;
    }

    setEmployeeFormReadOnly(true);
    const submitBtnText = document.getElementById('emp-submit-btn-text');
    if (submitBtnText) submitBtnText.innerText = 'Lưu';

    setTopbarFullpageMode({
        backFn: backToPersonnel,
        prefix: 'Hành Chính & Nhân Sự',
        title: `Hồ Sơ Nhân Sự | ${emp.full_name} (${emp.code || id})`,
        subText: '',
        badgesHtml: '',
        actionsHtml: ''
    });
}
window.openEditEmployeePage = openEditEmployeePage;
window.openEditEmployeeModal = openEditEmployeePage;

function backToPersonnel() {
    const formView = document.getElementById('view-employee-form');
    if (formView) formView.classList.add('hidden-view');

    if (previousActiveTab && previousActiveTab !== 'employee-form') {
        switchTab(previousActiveTab, true);
    } else {
        switchTab('nhan-su', true);
    }
}
window.backToPersonnel = backToPersonnel;
window.closeEmployeeModal = backToPersonnel;

async function submitEmployeeForm(event) {
    event.preventDefault();
    const formEl = (event && event.target && event.target.closest) ? event.target.closest('form') : document;
    const getEl = (id) => formEl.querySelector('#' + id) || document.getElementById(id);
    const getVal = (id) => (getEl(id)?.value || '').trim();

    const editId = getVal('emp-edit-id');
    const isEdit = Boolean(editId);


    const payload = {
        code: getVal('emp-code').toUpperCase(),
        full_name: getVal('emp-full-name'),
        nickname: getVal('emp-nickname'),
        phone_number: getVal('emp-phone'),
        zalo_id: getVal('emp-zalo'),
        email: getVal('emp-email'),
        department: getVal('emp-department'),
        role: getVal('emp-role'),
        gender: getVal('emp-gender') || 'MALE',
        date_of_birth: normalizeDateToISO(getVal('emp-dob')) || null,
        national_id: getVal('emp-national-id'),
        national_id_date: normalizeDateToISO(getVal('emp-national-id-date')) || null,
        national_id_place: getVal('emp-national-id-place'),
        tax_id: getVal('emp-tax-id'),
        insurance_number: getVal('emp-insurance-number'),
        bank_account: getVal('emp-bank-account'),
        bank_name: getVal('emp-bank-name'),
        bank_beneficiary: getVal('emp-bank-beneficiary').toUpperCase(),
        join_date: normalizeDateToISO(getVal('emp-join-date')) || null,
        license_number: getVal('emp-license-number'),
        license_expiry: normalizeDateToISO(getVal('emp-license-expiry')) || null,
        is_active: getVal('emp-is-active') === 'true',
        permanent_address: getVal('emp-permanent-address'),
        current_address: getVal('emp-current-address'),
        user: getVal('emp-user-id') ? parseInt(getVal('emp-user-id'), 10) : null
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

        showToast('success', data.message || 'Đã lưu hồ sơ nhân sự thành công!', 'Thành Công');
        await loadEmployeesData();
        if (typeof checkAndSyncMasterData === 'function') {
            checkAndSyncMasterData(true);
        }
        const savedId = editId || data.id || data.data?.id;
        if (savedId) {
            openEditEmployeePage(savedId, true);
        } else {
            backToPersonnel();
        }
    } catch (err) {
        console.error('Lỗi gửi form nhân sự:', err);
        showToast('error', err.message || 'Không thể lưu hồ sơ.', 'Lỗi Khai Báo');
    }
}
window.submitEmployeeForm = submitEmployeeForm;
window.printCurrentEmployeeProfile = printCurrentEmployeeProfile;

/**
 * 4. NHÂN SỰ: Khóa form, mở sửa, xóa và in trực tiếp
 */
function setEmployeeFormReadOnly(isReadOnly) {
    const form = document.getElementById('form-employee');
    if (form) {
        form.querySelectorAll('input:not(#emp-edit-id), select').forEach(el => {
            el.disabled = isReadOnly;
            if (isReadOnly) {
                el.classList.add('bg-slate-50', 'cursor-not-allowed');
            } else {
                el.classList.remove('bg-slate-50', 'cursor-not-allowed');
            }
        });
    }
    const delBtn = document.getElementById('btn-employee-delete-bottom');
    const printBtn = document.getElementById('btn-employee-print-bottom');
    const editBtn = document.getElementById('btn-employee-edit-bottom');
    const saveBtn = document.getElementById('emp-submit-btn');

    if (isReadOnly) {
        if (delBtn) delBtn.classList.remove('hidden');
        if (printBtn) printBtn.classList.remove('hidden');
        if (editBtn) {
            editBtn.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
            editBtn.disabled = false;
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    } else {
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    }
}
window.setEmployeeFormReadOnly = setEmployeeFormReadOnly;

function enableEmployeeEdit() {
    setEmployeeFormReadOnly(false);
    showToast('info', 'Đã bật chế độ Sửa Hồ Sơ. Bạn có thể thay đổi thông tin và bấm Lưu.', 'Chế Độ Sửa');
}
window.enableEmployeeEdit = enableEmployeeEdit;

async function deleteEmployeeItem(empId) {
    if (!empId) {
        showToast('warning', 'Không xác định được ID hồ sơ nhân sự cần xóa!');
        return;
    }
    const empName = document.getElementById('emp-full-name')?.value || 'nhân sự này';
    const empCode = document.getElementById('emp-code')?.value || '';
    const label = empCode ? `[${empCode}] ${empName}` : empName;

    const confirmed = await showConfirmModal({
        title: 'Xác Nhận Xóa Hồ Sơ Nhân Sự',
        message: `Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${label}" không?\n\nDữ liệu sẽ được lưu vết kiểm toán và chuyển sang trạng thái xóa mềm (Soft-Delete) an toàn.`,
        confirmText: 'Xác Nhận Xóa',
        cancelText: 'Hủy Bỏ',
        type: 'danger',
        icon: 'ph-bold ph-trash text-2xl'
    });
    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/personnel/employees/${empId}/`, {
            method: 'DELETE'
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.success || res.status === 204)) {
            showToast('success', data.message || `Đã xóa nhân sự ${label} thành công!`, 'Thành Công');
            if (typeof backToPersonnel === 'function') {
                backToPersonnel();
            }
            if (typeof loadEmployeesData === 'function') {
                await loadEmployeesData();
            }
            if (typeof checkAndSyncMasterData === 'function') {
                checkAndSyncMasterData(true);
            }
        } else {
            const errMsg = data.error || data.message || 'Không thể xóa hồ sơ nhân sự này do đã phát sinh ràng buộc nghiệp vụ!';
            showToast('danger', errMsg, 'Lỗi Xóa Nhân Sự');
        }
    } catch (err) {
        console.error('Lỗi khi xóa nhân sự:', err);
        showToast('danger', 'Lỗi kết nối máy chủ khi thực hiện xóa nhân sự!', 'Lỗi');
    }
}
window.deleteEmployeeItem = deleteEmployeeItem;

function confirmDeleteCurrentEmployee() {
    const id = document.getElementById('emp-edit-id')?.value;
    if (!id) {
        showToast('warning', 'Chưa có hồ sơ nhân sự nào được lưu để tạm ngưng!', 'Thông Báo');
        return;
    }
    deleteEmployeeItem(id);
}
window.confirmDeleteCurrentEmployee = confirmDeleteCurrentEmployee;

function printCurrentEmployeeProfile() {
    const id = document.getElementById('emp-edit-id')?.value;
    if (!id) {
        showToast('warning', 'Vui lòng lưu hồ sơ nhân sự trước khi in ấn!', 'Thông Báo');
        return;
    }
    openDirectPrintEmployee(id);
}
window.printCurrentEmployeeProfile = printCurrentEmployeeProfile;

async function openDirectPrintEmployee(empId) {
    if (!empId) return;
    try {
        let emp = (rawEmployeesList || []).find(e => e.id == empId);
        if (!emp) {
            const res = await fetchWithAuth(`/api/personnel/employees/${empId}/`);
            if (res.ok) emp = await res.json();
        }
        if (!emp) throw new Error('Không tìm thấy thông tin nhân sự');

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            window.print();
            return;
        }

        const co = getSystemCompanyProfile();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Hồ Sơ Nhân Sự - ${emp.full_name}</title>
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 15mm 18mm 15mm 18mm; 
                    }
                    *, *::before, *::after { 
                        box-sizing: border-box; 
                    }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        background: #ffffff; 
                        color: #0f172a; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                        font-size: 13px; 
                        line-height: 1.5; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .print-sheet {
                        width: 100%;
                        max-width: 175mm;
                        margin: 0 auto;
                        padding: 10mm 4mm 12mm 4mm;
                        box-sizing: border-box;
                        background: #ffffff;
                    }
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 15mm 18mm 15mm 18mm; 
                        }
                        html, body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 100% !important; 
                            background: #ffffff !important; 
                        }
                        .print-sheet { 
                            width: 100% !important; 
                            max-width: 100% !important; 
                            margin: 0 !important; 
                            padding: 8mm 2mm 10mm 2mm !important; 
                            box-sizing: border-box !important; 
                            page-break-inside: avoid !important; 
                            page-break-after: avoid !important; 
                        }
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        border-bottom: 2.5px solid #0f766e; 
                        padding-bottom: 12px; 
                        margin-bottom: 20px; 
                    }
                    .title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: 800; 
                        color: #0f766e; 
                        text-transform: uppercase; 
                        letter-spacing: 0.5px;
                        margin: 16px 0 24px 0; 
                    }
                    .meta-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 24px; 
                        table-layout: fixed; 
                    }
                    .meta-table td { 
                        padding: 8px 12px; 
                        border: 1px solid #cbd5e1; 
                        word-wrap: break-word; 
                        vertical-align: middle;
                        font-size: 13px;
                    }
                    .meta-table td.label { 
                        font-weight: 700; 
                        background: #f8fafc; 
                        width: 22%; 
                        color: #334155; 
                    }
                    .signatures { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 50px; 
                        text-align: center; 
                        page-break-inside: avoid; 
                    }
                    .sig-box { 
                        width: 30%; 
                    }
                    .sig-title { 
                        font-weight: 700; 
                        color: #1e293b;
                        margin-bottom: 75px; 
                    }
                    .footer-note {
                        margin-top: 35px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 8px;
                        font-size: 11px;
                        color: #64748b;
                        font-style: italic;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="print-sheet">
                    <div class="header">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f766e; letter-spacing: 0.5px;">${co.company_name} — PHÒNG HÀNH CHÍNH NHÂN SỰ</div>
                            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">Hotline: ${co.phone || '—'} • Đ/c: ${co.address || '—'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; font-family: monospace; font-size: 15px; color: #0f766e;">MÃ NV: ${emp.code || emp.id}</div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>

                    <div class="title">SƠ YẾU HỒ SƠ CÁN BỘ / TÀI XẾ DOANH NGHIỆP</div>

                    <table class="meta-table">
                        <tr>
                            <td class="label">Họ Và Tên:</td>
                            <td style="font-weight: bold; font-size: 15px;">${emp.full_name}</td>
                            <td class="label">Biệt Danh / Tên Thường Gọi:</td>
                            <td>${emp.nickname || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Phòng Ban:</td>
                            <td><strong>${emp.department || 'Đội Xe (FLEET)'}</strong></td>
                            <td class="label">Chức Vụ / Vị Trí:</td>
                            <td><strong>${emp.role_label || emp.role}</strong></td>
                        </tr>
                        <tr>
                            <td class="label">Số Điện Thoại:</td>
                            <td style="font-weight: bold;">${emp.phone_number || '-'}</td>
                            <td class="label">Zalo / Liên Lạc:</td>
                            <td>${emp.zalo_id || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Số GPLX (Bằng lái):</td>
                            <td style="font-family: monospace; font-weight: bold;">${emp.license_number || '-'}</td>
                            <td class="label">Hạn Dùng GPLX:</td>
                            <td>${emp.license_expiry || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Ngày Vào Làm:</td>
                            <td>${emp.join_date || '-'}</td>
                            <td class="label">Tình Trạng Công Tác:</td>
                            <td><strong>${emp.is_active ? 'ĐANG LÀM VIỆC' : 'TẠM NGƯNG CÔNG TÁC'}</strong></td>
                        </tr>
                    </table>

                    <div class="signatures">
                        <div class="sig-box">
                            <div class="sig-title">Nhân Sự Được Khai Báo</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Trưởng Bộ Phận / Điều Hành</div>
                            <div>(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Ban Giám Đốc Phê Duyệt</div>
                            <div>(Ký & đóng dấu)</div>
                        </div>
                    </div>

                    <div class="footer-note">
                        <span>* Hồ sơ nhân sự lưu hành nội bộ, bảo mật thông tin theo quy định doanh nghiệp.</span>
                        <span>${co.short_name || co.company_name} • Hotline: ${co.phone || '—'}</span>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (e) {
        console.error('Lỗi in hồ sơ nhân sự:', e);
        showToast('error', 'Không thể mở lệnh in hồ sơ nhân sự', 'Lỗi In');
    }
}
window.openDirectPrintEmployee = openDirectPrintEmployee;

window.renderRoleCharts = typeof renderRoleCharts !== 'undefined' ? renderRoleCharts : undefined;
window.switchRoleDonutOption = typeof switchRoleDonutOption !== 'undefined' ? switchRoleDonutOption : undefined;
