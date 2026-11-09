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
    if (el('emp-base-salary')) el('emp-base-salary').value = '5,000,000';
    if (el('emp-insurance-salary')) el('emp-insurance-salary').value = '5,000,000';
    if (el('emp-is-insurance')) el('emp-is-insurance').value = 'true';
    if (el('emp-is-active')) el('emp-is-active').value = 'true';
    if (el('emp-permanent-address')) el('emp-permanent-address').value = '';
    if (el('emp-current-address')) el('emp-current-address').value = '';

    handleEmployeeRoleChange();
    loadAvailableUsers(null, null);

    const contractCard = document.getElementById('emp-active-contract-card');
    const badgeContainer = document.getElementById('emp-contract-badge-container');
    const infoBox = document.getElementById('emp-contract-info-box');
    if (badgeContainer) {
        badgeContainer.innerHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">Chưa ký HĐ</span>`;
    }
    if (infoBox) {
        infoBox.innerHTML = `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                Sau khi lưu hồ sơ cá nhân của nhân sự mới, bạn có thể thực hiện ký Hợp Đồng Lao Động để kích hoạt chính sách tiền lương và bảo hiểm.
            </div>
        `;
    }

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
    if (el('emp-base-salary')) el('emp-base-salary').value = emp.base_salary || 0;
    if (el('emp-insurance-salary')) el('emp-insurance-salary').value = emp.insurance_salary || 5000000;
    if (el('emp-is-insurance')) el('emp-is-insurance').value = emp.is_social_insurance_participant ? 'true' : 'false';
    if (el('emp-is-active')) el('emp-is-active').value = emp.is_active ? 'true' : 'false';
    if (el('emp-permanent-address')) el('emp-permanent-address').value = emp.permanent_address || '';
    if (el('emp-current-address')) el('emp-current-address').value = emp.current_address || '';

    handleEmployeeRoleChange();
    loadAvailableUsers(emp.id, emp.user);

    // RENDER CARD 4: THÔNG TIN HỢP ĐỒNG LAO ĐỘNG HIỆN HÀNH (GSS STANDARD - MASTER 360°)
    const contractCard = document.getElementById('emp-active-contract-card');
    const badgeContainer = document.getElementById('emp-contract-badge-container');
    const infoBox = document.getElementById('emp-contract-info-box');

    if (contractCard && infoBox) {
        contractCard.classList.remove('hidden');
        const c = emp.active_contract;
        if (c) {
            if (badgeContainer) {
                badgeContainer.innerHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><i class="ph-bold ph-check-circle"></i><span>HĐ Hiệu Lực: ${escapeHtml(c.contract_number)}</span></span>`;
            }
            
            const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0)) + ' đ';
            const taxTypeLabel = c.tax_resident_type === 'CASUAL_10' ? 'Thời vụ / Vãng lai (Khấu trừ 10%)' : (c.tax_resident_type === 'NON_RESIDENT' ? 'Không cư trú (Khấu trừ 20%)' : 'Cư trú (Biểu lũy tiến 5/7 bậc)');

            infoBox.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                    <div class="md:col-span-4 space-y-1">
                        <span class="text-slate-500 font-medium block">Số & Loại Hợp Đồng:</span>
                        <div class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <span class="font-mono text-indigo-900">${escapeHtml(c.contract_number)}</span>
                            <span class="text-[11px] text-slate-500 font-normal">(${escapeHtml(c.contract_type_label || '')})</span>
                        </div>
                        <span class="text-[11px] font-mono text-slate-500 block">Thời hạn: ${c.start_date || '—'} ➔ ${c.end_date || 'Không thời hạn'}</span>
                    </div>

                    <div class="md:col-span-4 space-y-1">
                        <span class="text-slate-500 font-medium block">Vị Trí & Phòng Ban HĐ:</span>
                        <div class="font-bold text-slate-900">${escapeHtml(c.job_title || c.role_label || '')}</div>
                        <span class="text-[11px] text-slate-500 block">${escapeHtml(c.department_label || '')}</span>
                    </div>

                    <div class="md:col-span-4 space-y-1">
                        <span class="text-slate-500 font-medium block">Tỷ Lệ Hưởng Lương & Trợ Cấp:</span>
                        <div class="font-bold text-indigo-900 font-mono">${c.probation_rate || 100}% lương chính</div>
                        ${c.appendix_number ? `<span class="text-[11px] text-emerald-700 font-bold block">Đang áp dụng Phụ lục ${escapeHtml(c.appendix_number)} (${c.appendix_effective_date || ''})</span>` : '<span class="text-[11px] text-slate-400 block">Áp dụng HĐLĐ gốc</span>'}
                    </div>

                    <div class="md:col-span-12 grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
                        <div class="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span class="text-[10px] text-slate-500 font-bold uppercase block">Lương Căn Bản</span>
                            <span class="font-mono font-bold text-slate-900 text-xs mt-0.5 block">${fmt(c.base_salary)}</span>
                        </div>
                        <div class="p-2 rounded-lg bg-teal-50/70 border border-teal-200">
                            <span class="text-[10px] text-teal-800 font-bold uppercase block">Lương Đóng BHXH</span>
                            <span class="font-mono font-bold text-teal-900 text-xs mt-0.5 block">${fmt(c.insurance_salary)}</span>
                        </div>
                        <div class="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200">
                            <span class="text-[10px] text-indigo-800 font-bold uppercase block">Phụ Cấp HĐ</span>
                            <span class="font-mono font-bold text-indigo-900 text-xs mt-0.5 block">${fmt(c.allowance_amount)}</span>
                        </div>
                        <div class="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                            <span class="text-[10px] text-emerald-800 font-bold uppercase block">Trợ Cấp Phúc Lợi</span>
                            <span class="font-mono font-bold text-emerald-900 text-xs mt-0.5 block">${fmt(c.subsidy_amount)}</span>
                        </div>
                        <div class="p-2 rounded-lg bg-amber-50/70 border border-amber-300 col-span-2 sm:col-span-1">
                            <span class="text-[10px] text-amber-900 font-black uppercase block">Tổng Thu Nhập HĐ</span>
                            <span class="font-mono font-black text-amber-950 text-xs mt-0.5 block">${fmt(c.total_salary)}</span>
                        </div>
                    </div>

                    <div class="md:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="text-[11px] font-bold ${c.is_social_insurance_participant ? 'text-teal-700' : 'text-slate-400'}">
                                ${c.is_social_insurance_participant ? '✓ Trích nộp BHXH (10.5%)' : '✗ Không tham gia BHXH'}
                            </span>
                            <span class="text-slate-300">•</span>
                            <span class="text-[11px] font-bold ${c.is_taxable ? 'text-indigo-700' : 'text-slate-400'}">
                                ${c.is_taxable ? '✓ Tính thuế: ' + taxTypeLabel : '✗ Miễn tính thuế'}
                            </span>
                            <span class="text-slate-300">•</span>
                            <span class="text-[11px] font-bold ${c.is_union_member ? 'text-amber-700' : 'text-slate-400'}">
                                ${c.is_union_member ? '✓ Đoàn viên Công đoàn (1%)' : '✗ Không tham gia Công đoàn'}
                            </span>
                        </div>

                        <div class="flex items-center gap-2">
                            <button type="button" onclick="openContractDetailPage(${c.id})" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer">
                                <i class="ph-bold ph-pencil-simple"></i>
                                <span>Xem & Sửa HĐ Hiện Hành</span>
                            </button>
                            <button type="button" onclick="openCreateContractPage(${emp.id})" class="px-3 py-1.5 border border-indigo-600 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
                                <i class="ph-bold ph-plus-circle"></i>
                                <span>Ký HĐ Mới</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            if (badgeContainer) {
                badgeContainer.innerHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Chưa Ký HĐLĐ</span>`;
            }
            infoBox.innerHTML = `
                <div class="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div class="text-amber-900">
                        <span class="font-bold block text-sm">Nhân viên này chưa có Hợp đồng lao động đang hiệu lực.</span>
                        <span class="text-slate-600 mt-0.5 block">Cần ký kết HĐLĐ để thiết lập mức lương căn bản, lương BHXH và các phụ cấp làm căn cứ tính lương tự động.</span>
                    </div>
                    <button type="button" onclick="openCreateContractPage(${emp.id})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                        <i class="ph-bold ph-plus-circle text-base"></i>
                        <span>Ký HĐ Lao Động Ngay</span>
                    </button>
                </div>
            `;
        }
    }

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

    const baseSalaryClean = String(getVal('emp-base-salary') || '0').replace(/\D/g, '');
    const insSalaryClean = String(getVal('emp-insurance-salary') || '0').replace(/\D/g, '');

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
        base_salary: parseInt(baseSalaryClean, 10) || 0,
        insurance_salary: parseInt(insSalaryClean, 10) || 5000000,
        is_social_insurance_participant: getVal('emp-is-insurance') === 'true',
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
                            <td class="label">Mức Lương Cơ Bản:</td>
                            <td style="font-weight: bold; font-size: 14px; color: #0f766e;">${new Intl.NumberFormat('vi-VN').format(emp.base_salary || 0)} đ</td>
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

// 12. Phân Hệ Quản Trị Nhân Sự, Chấm Công & Hybrid Payroll (Window Exports)
window.loadAttendancePeriodsAndData = typeof loadAttendancePeriodsAndData !== 'undefined' ? loadAttendancePeriodsAndData : undefined;
window.loadAttendanceData = typeof loadAttendanceData !== 'undefined' ? loadAttendanceData : undefined;
window.recalcAttendanceRow = typeof recalcAttendanceRow !== 'undefined' ? recalcAttendanceRow : undefined;
window.saveAttendanceRow = typeof saveAttendanceRow !== 'undefined' ? saveAttendanceRow : undefined;
window.saveAllAttendanceRows = typeof saveAllAttendanceRows !== 'undefined' ? saveAllAttendanceRows : undefined;
window.autoGenerateMonthlyAttendance = typeof autoGenerateMonthlyAttendance !== 'undefined' ? autoGenerateMonthlyAttendance : undefined;
window.onPayrollPeriodChange = typeof onPayrollPeriodChange !== 'undefined' ? onPayrollPeriodChange : undefined;
window.executePayrollCalculation = typeof executePayrollCalculation !== 'undefined' ? executePayrollCalculation : undefined;
window.updatePayrollPeriodStatus = typeof updatePayrollPeriodStatus !== 'undefined' ? updatePayrollPeriodStatus : undefined;
window.exportBankBatchTransfer = typeof exportBankBatchTransfer !== 'undefined' ? exportBankBatchTransfer : undefined;
window.openPrintPayslipModal = typeof openPrintPayslipModal !== 'undefined' ? openPrintPayslipModal : undefined;
window.closePrintPayslipModal = typeof closePrintPayslipModal !== 'undefined' ? closePrintPayslipModal : undefined;
window.openCreatePeriodModal = typeof openCreatePeriodModal !== 'undefined' ? openCreatePeriodModal : undefined;
window.closeCreatePeriodModal = typeof closeCreatePeriodModal !== 'undefined' ? closeCreatePeriodModal : undefined;
window.submitCreatePeriod = typeof submitCreatePeriod !== 'undefined' ? submitCreatePeriod : undefined;
window.savePayrollPolicyConfig = typeof savePayrollPolicyConfig !== 'undefined' ? savePayrollPolicyConfig : undefined;
window.saveSalaryDeductionRate = typeof saveSalaryDeductionRate !== 'undefined' ? saveSalaryDeductionRate : undefined;
window.getContractTypePrefix = typeof getContractTypePrefix !== 'undefined' ? getContractTypePrefix : undefined;
window.suggestContractNumber = typeof suggestContractNumber !== 'undefined' ? suggestContractNumber : undefined;
window.onContractTypeChange = typeof onContractTypeChange !== 'undefined' ? onContractTypeChange : undefined;
window.openCreateContractPage = typeof openCreateContractPage !== 'undefined' ? openCreateContractPage : undefined;
window.openContractDetailPage = typeof openContractDetailPage !== 'undefined' ? openContractDetailPage : undefined;
window.openCreateContractModal = typeof openCreateContractPage !== 'undefined' ? openCreateContractPage : undefined;
window.openEditContractModal = typeof openContractDetailPage !== 'undefined' ? openContractDetailPage : undefined;
window.enableContractEdit = typeof enableContractEdit !== 'undefined' ? enableContractEdit : undefined;
window.submitContractDetailForm = typeof submitContractDetailForm !== 'undefined' ? submitContractDetailForm : undefined;
window.confirmDeleteContract = typeof confirmDeleteContract !== 'undefined' ? confirmDeleteContract : undefined;
window.printCurrentContract = typeof printCurrentContract !== 'undefined' ? printCurrentContract : undefined;
window.openDirectPrintContract = typeof openDirectPrintContract !== 'undefined' ? openDirectPrintContract : undefined;
window.backToContracts = typeof backToContracts !== 'undefined' ? backToContracts : undefined;
window.toggleAddAppendixInline = typeof toggleAddAppendixInline !== 'undefined' ? toggleAddAppendixInline : undefined;
window.submitInlineAppendix = typeof submitInlineAppendix !== 'undefined' ? submitInlineAppendix : undefined;
window.openPayrollSlipDetailPage = typeof openPayrollSlipDetailPage !== 'undefined' ? openPayrollSlipDetailPage : undefined;
window.openEditPayrollSlipModal = typeof openPayrollSlipDetailPage !== 'undefined' ? openPayrollSlipDetailPage : undefined;
window.enableSlipEdit = typeof enableSlipEdit !== 'undefined' ? enableSlipEdit : undefined;
window.submitSlipDetailForm = typeof submitSlipDetailForm !== 'undefined' ? submitSlipDetailForm : undefined;
window.printCurrentPayrollSlip = typeof printCurrentPayrollSlip !== 'undefined' ? printCurrentPayrollSlip : undefined;
window.backToPayroll = typeof backToPayroll !== 'undefined' ? backToPayroll : undefined;
window.renderRoleCharts = typeof renderRoleCharts !== 'undefined' ? renderRoleCharts : undefined;
window.switchRoleDonutOption = typeof switchRoleDonutOption !== 'undefined' ? switchRoleDonutOption : undefined;
