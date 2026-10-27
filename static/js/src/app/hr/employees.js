// --- 6. PHÂN HỆ QUẢN TRỊ NHÂN SỰ & HYBRID PAYROLL ---
let currentHRSubTab = 'directory';
let rawEmployeesList = [];
let rawContractsList = [];
let rawPayrollPeriodsList = [];
let currentPayrollPeriodDetail = null;
let currentPayrollSlipsList = [];

async function loadHRData() {
    const activeSubTab = currentHRSubTab || 'directory';
    await loadEmployeesData();
    if (activeSubTab !== 'directory') {
        switchHRSubTab(activeSubTab);
    }
}

function switchHRSubTab(tabKey) {
    currentHRSubTab = tabKey;
    const tabs = ['directory', 'contracts', 'attendance', 'payroll', 'policies'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`hr-tab-${t}-btn`);
        const panel = document.getElementById(`hr-panel-${t}`);
        if (btn) {
            if (t === tabKey) {
                btn.className = 'hr-tab-btn active h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-teal-600 bg-teal-50/70 text-teal-900 shadow-2xs box-border whitespace-nowrap';
            } else {
                btn.className = 'hr-tab-btn h-10 px-3.5 rounded-xl text-xs md:text-sm font-bold font-heading flex items-center justify-center space-x-1.5 transition-all cursor-pointer border-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 box-border whitespace-nowrap';
            }
        }
        if (panel) {
            if (t === tabKey) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
        }
    });

    const createEmpBtn = document.getElementById('btn-create-employee');
    const createContractBtn = document.getElementById('btn-create-contract');
    const autoAttendanceBtn = document.getElementById('btn-auto-attendance');
    const createPeriodBtn = document.getElementById('btn-create-period');

    if (createEmpBtn) createEmpBtn.classList.toggle('hidden', tabKey !== 'directory');
    const empTemplateBtn = document.getElementById('btn-employee-template');
    const empImportBtn = document.getElementById('btn-employee-import');
    const empExportBtn = document.getElementById('btn-employee-export');
    if (empTemplateBtn) empTemplateBtn.classList.toggle('hidden', tabKey !== 'directory');
    if (empImportBtn) empImportBtn.classList.toggle('hidden', tabKey !== 'directory');
    if (empExportBtn) empExportBtn.classList.toggle('hidden', tabKey !== 'directory');
    if (createContractBtn) createContractBtn.classList.toggle('hidden', tabKey !== 'contracts');
    if (autoAttendanceBtn) autoAttendanceBtn.classList.toggle('hidden', tabKey !== 'attendance');
    if (createPeriodBtn) createPeriodBtn.classList.toggle('hidden', tabKey !== 'payroll');

    if (tabKey === 'directory') loadEmployeesData();
    else if (tabKey === 'contracts') loadContractsData();
    else if (tabKey === 'attendance') loadAttendancePeriodsAndData();
    else if (tabKey === 'payroll') loadPayrollPeriodsData();
    else if (tabKey === 'policies') loadPayrollPoliciesData();
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
            const setTxt = (id, val) => { const elem = el(id); if (elem && val !== undefined) elem.innerText = val; };

            setTxt('hr-kpi-total', s.total || 0);
            setTxt('hr-card-total-line1', s.card_total?.line_1);
            setTxt('hr-card-total-line2', s.card_total?.line_2);

            setTxt('hr-kpi-drivers', s.drivers || 0);
            setTxt('hr-card-drivers-line1', s.card_drivers?.line_1);
            setTxt('hr-card-drivers-line2', s.card_drivers?.line_2);

            const officeCount = s.card_office?.total !== undefined ? s.card_office.total : ((s.dispatchers || 0) + (s.accountants || 0) + (s.sales || 0));
            setTxt('hr-kpi-office', officeCount);
            setTxt('hr-card-office-line1', s.card_office?.line_1);
            setTxt('hr-card-office-line2', s.card_office?.line_2);

            const warningTotal = s.card_compliance?.total !== undefined ? s.card_compliance.total : ((s.expiring_licenses_count || 0) + (s.expiring_contracts_count || 0));
            setTxt('hr-kpi-warning', warningTotal);
            setTxt('hr-card-compliance-line1', s.card_compliance?.line_1);
            setTxt('hr-card-compliance-line2', s.card_compliance?.line_2);

            setTxt('hr-kpi-payroll', s.card_payroll?.total || '-- đ');
            setTxt('hr-card-payroll-line1', s.card_payroll?.line_1);
            setTxt('hr-card-payroll-line2', s.card_payroll?.line_2);
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

function filterExpiringItems() {
    switchHRSubTab('contracts');
    const statusSelect = document.getElementById('contract-filter-status');
    if (statusSelect) statusSelect.value = 'ACTIVE';
}

function filterEmployeesTable() {
    const q = (document.getElementById('emp-search-input')?.value || '').trim().toLowerCase();
    const dept = document.getElementById('emp-filter-dept')?.value || 'ALL';
    const role = document.getElementById('emp-filter-role')?.value || 'ALL';
    const status = document.getElementById('emp-filter-status')?.value || 'ALL';

    const filtered = (rawEmployeesList || []).filter(item => {
        const str = `${item.code} ${item.full_name} ${item.nickname || ''} ${item.phone_number || ''} ${item.national_id || ''} ${item.bank_account || ''}`.toLowerCase();
        const matchesQuery = !q || str.includes(q);
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
                <td colspan="12" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-user-circle text-3xl mb-2 text-slate-300 block"></i>
                    Không tìm thấy nhân sự nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map((emp, index) => {
        const contractInfo = emp.active_contract ? `${emp.active_contract.contract_type_label || 'HĐ'}` : '<span class="text-slate-400">Chưa ký</span>';
        const bankInfo = emp.bank_account ? `<span class="font-mono font-bold">${escapeHtml(emp.bank_account)}</span> (${escapeHtml(emp.bank_name || 'NH')})` : '<span class="text-slate-400">—</span>';
        const legalInfo = emp.national_id ? `<span class="font-mono">${escapeHtml(emp.national_id)}</span>` : '<span class="text-slate-400">—</span>';

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2.5 px-3.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200 text-xs tabular-nums select-none w-12">${index + 1}</td>
                <td class="py-2.5 px-3.5 font-mono font-bold text-teal-900 border-r border-slate-200 text-xs">${escapeHtml(emp.code)}</td>
                <td class="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200 text-sm">
                    <div>${escapeHtml(emp.full_name)} ${emp.nickname ? `<span class="text-xs text-slate-500 font-normal">(${escapeHtml(emp.nickname)})</span>` : ''}</div>
                    <div class="text-[11px] text-slate-400 font-normal">${emp.gender_label || ''} ${emp.date_of_birth ? '• ' + emp.date_of_birth : ''}</div>
                </td>
                <td class="py-2.5 px-3.5 text-xs border-r border-slate-200">
                    <div>${legalInfo}</div>
                    ${emp.tax_id ? `<div class="text-[11px] text-slate-500">MST: ${escapeHtml(emp.tax_id)}</div>` : ''}
                </td>
                <td class="py-2.5 px-3.5 text-xs border-r border-slate-200 font-mono">
                    <div class="font-bold text-slate-800">${escapeHtml(emp.phone_number || '—')}</div>
                    ${emp.zalo_id ? `<div class="text-[11px] text-teal-600 font-medium">Zalo: ${escapeHtml(emp.zalo_id)}</div>` : ''}
                </td>
                <td class="py-2.5 px-3.5 text-xs font-medium text-slate-700 border-r border-slate-200">${escapeHtml(emp.department_label || emp.department)}</td>
                <td class="py-2.5 px-3.5 text-xs font-bold border-r border-slate-200">
                    <span class="${emp.role === 'DRIVER' ? 'text-emerald-700' : (emp.role === 'DIRECTOR' ? 'text-purple-700' : 'text-blue-700')}">
                        ${escapeHtml(emp.role_label || emp.role)}
                    </span>
                </td>
                <td class="py-2.5 px-3.5 text-xs border-r border-slate-200">
                    ${emp.license_number ? `
                        <div class="font-mono font-bold text-slate-800">${escapeHtml(emp.license_number)}</div>
                        ${emp.license_expiry ? `<div class="text-[11px] text-slate-500">Hạn: ${emp.license_expiry}</div>` : ''}
                    ` : '<span class="text-slate-400">—</span>'}
                </td>
                <td class="py-2.5 px-3.5 text-xs border-r border-slate-200">${bankInfo}</td>
                <td class="py-2.5 px-3.5 text-xs font-mono font-bold text-right text-slate-900 border-r border-slate-200 tabular-nums">${new Intl.NumberFormat('vi-VN').format(emp.base_salary || 0)} đ</td>
                <td class="py-2.5 px-3.5 text-center border-r border-slate-200 text-xs font-semibold whitespace-nowrap">
                    ${emp.is_active ? '<span class="text-emerald-700 font-bold">Đang làm</span>' : '<span class="text-slate-400 font-medium">Tạm ngưng</span>'}
                </td>
                <td class="py-2.5 px-3.5 text-center">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        <!-- 1. Xem Nhân Viên (Toàn màn hình) -->
                        <button type="button" onclick="openEditEmployeePage(${emp.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Xem chi tiết, Sửa, Lưu & Xóa hồ sơ nhân sự">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        <!-- 2. In nhanh Hồ sơ nhân sự khổ A4 -->
                        <button type="button" onclick="openDirectPrintEmployee(${emp.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="In hồ sơ nhân sự">
                            <i class="ph-bold ph-printer"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(items)) {
        const totalBaseSal = items.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);
        window.BimTableFooter.render('employees-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-teal-800 font-extrabold">${items.length}</span> nhân sự trong danh sách`, colspan: 8, class: 'text-slate-700' },
                { html: `<span class="text-emerald-700 font-bold tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalBaseSal)} đ</span>`, align: 'right' },
                { text: '', align: 'center' },
                { text: '', align: 'center' }
            ]
        });
    }
}


