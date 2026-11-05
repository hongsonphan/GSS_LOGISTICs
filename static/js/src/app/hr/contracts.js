// --- SUB-PANEL 2: HỢP ĐỒNG LAO ĐỘNG ---
async function loadContractsData() {
    try {
        const status = document.getElementById('contract-filter-status')?.value || '';
        const url = status ? `/api/personnel/contracts/?status=${status}` : '/api/personnel/contracts/';
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Lỗi tải danh sách hợp đồng');
        rawContractsList = await res.json();
        
        const badge = document.getElementById('contracts-count-badge');
        if (badge) badge.innerText = `${rawContractsList.length} HĐ`;

        renderContractsTable(rawContractsList);
    } catch (err) {
        console.error('Lỗi tải HĐLĐ:', err);
    }
}

function renderContractsTable(items) {
    const tbody = document.getElementById('contracts-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="p-8 text-center text-slate-400 font-medium">
                    <i class="ph ph-file-text text-3xl mb-2 text-slate-300 block"></i>
                    Không có hợp đồng lao động nào.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map((c, index) => {
        const isExpiring = c.end_date && new Date(c.end_date) <= new Date(Date.now() + 30 * 86400000);
        const dateBadge = isExpiring && c.status === 'ACTIVE' 
            ? `<span class="text-amber-600 font-bold font-mono">${c.end_date} (Sắp hết hạn)</span>`
            : `<span class="font-mono text-slate-700">${c.end_date || 'Không thời hạn'}</span>`;

        const totalSalaryVal = (c.total_salary !== undefined && c.total_salary !== null) ? c.total_salary : ((c.base_salary || 0) + (c.allowance_amount || 0) + (c.subsidy_amount || 0));
        const allowancesSum = (c.allowance_amount || 0) + (c.subsidy_amount || 0);

        const bhxhBadge = c.is_social_insurance_participant !== false 
            ? `<span class="font-bold text-[11px] text-teal-700" title="Có đóng BHXH">BHXH</span>`
            : `<span class="font-medium text-[11px] text-slate-300" title="Không tham gia BHXH">-</span>`;
        const tncnBadge = c.is_taxable !== false 
            ? `<span class="font-bold text-[11px] text-indigo-700" title="Có tính thuế TNCN">TNCN</span>`
            : `<span class="font-medium text-[11px] text-slate-300" title="Miễn tính thuế">-</span>`;
        const congDoanBadge = c.is_union_member === true 
            ? `<span class="font-bold text-[11px] text-amber-700" title="Đoàn viên công đoàn">CĐ</span>`
            : `<span class="font-medium text-[11px] text-slate-300" title="Không tham gia">-</span>`;

        const deptDisplay = c.department_label || c.department || '—';
        const roleDisplay = c.job_title || c.role_label || c.role || '—';

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
                <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-200 text-xs w-12">${index + 1}</td>
                <td class="py-2.5 px-3 font-mono font-bold text-indigo-900 border-r border-slate-200 text-xs">${escapeHtml(c.contract_number)}</td>
                <td class="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 text-xs">
                    <div>${escapeHtml(c.employee_name)}</div>
                    <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(c.employee_code)}</div>
                </td>
                <td class="py-2.5 px-3 text-xs text-slate-700 border-r border-slate-200 whitespace-nowrap">${escapeHtml(c.contract_type_label || c.contract_type)}</td>
                <td class="py-2.5 px-3 text-xs text-slate-700 border-r border-slate-200">
                    <div class="font-bold text-slate-800">${escapeHtml(roleDisplay)}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(deptDisplay)}</div>
                </td>
                <td class="py-2.5 px-3 text-xs font-mono border-r border-slate-200 text-center whitespace-nowrap">
                    <div>${c.start_date}</div>
                    <div class="text-[11px]">${dateBadge}</div>
                </td>
                <td class="py-2.5 px-3 text-xs font-mono font-bold text-right text-slate-900 border-r border-slate-200 whitespace-nowrap">${new Intl.NumberFormat('vi-VN').format(c.base_salary || 0)} đ</td>
                <td class="py-2.5 px-3 text-xs font-mono font-medium text-right text-slate-700 border-r border-slate-200 whitespace-nowrap">${allowancesSum > 0 ? new Intl.NumberFormat('vi-VN').format(allowancesSum) + ' đ' : '0 đ'}</td>
                <td class="py-2.5 px-3 text-xs font-mono font-black text-right text-indigo-950 border-r border-slate-200 bg-indigo-50/40 whitespace-nowrap">${new Intl.NumberFormat('vi-VN').format(totalSalaryVal)} đ</td>
                <td class="py-2.5 px-3 text-xs font-mono font-bold text-right text-teal-800 border-r border-slate-200 whitespace-nowrap">${new Intl.NumberFormat('vi-VN').format(c.insurance_salary || 0)} đ</td>
                <td class="py-2.5 px-3 text-center text-xs border-r border-slate-200 whitespace-nowrap">
                    <div class="inline-flex items-center gap-1">
                        ${bhxhBadge}
                        ${tncnBadge}
                        ${congDoanBadge}
                    </div>
                </td>
                <td class="py-2.5 px-3 text-center text-xs border-r border-slate-200 font-bold text-indigo-700">${c.appendices ? c.appendices.length : 0}</td>
                <td class="py-2.5 px-3 text-center text-xs font-bold border-r border-slate-200 whitespace-nowrap">
                    <span class="${c.status === 'ACTIVE' ? 'text-emerald-700' : (c.status === 'EXPIRED' ? 'text-amber-600' : 'text-slate-400')}">
                        ${escapeHtml(c.status_label || c.status)}
                    </span>
                </td>
                <td class="py-2.5 px-3 text-center text-xs whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 justify-center">
                        <button type="button" onclick="openContractDetailPage(${c.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-600 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Xem chi tiết, Sửa, Lưu, In & Chấm dứt hợp đồng">
                            <i class="ph-bold ph-eye"></i>
                            <span>Xem</span>
                        </button>
                        <button type="button" onclick="openDirectPrintContract(${c.id})" 
                            class="px-2.5 py-1 bg-transparent hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="In hợp đồng lao động khổ A4">
                            <i class="ph-bold ph-printer"></i>
                            <span>In</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (window.BimTableFooter && Array.isArray(items)) {
        const totalBaseSalary = items.reduce((sum, c) => sum + (Number(c.base_salary) || 0), 0);
        const totalAllowancesSum = items.reduce((sum, c) => sum + ((Number(c.allowance_amount) || 0) + (Number(c.subsidy_amount) || 0)), 0);
        const totalGrossIncome = items.reduce((sum, c) => sum + ((c.total_salary !== undefined && c.total_salary !== null) ? Number(c.total_salary) : ((Number(c.base_salary) || 0) + (Number(c.allowance_amount) || 0) + (Number(c.subsidy_amount) || 0))), 0);
        const totalInsuranceSalary = items.reduce((sum, c) => sum + (Number(c.insurance_salary || c.base_salary) || 0), 0);
        const totalAppendixCount = items.reduce((sum, c) => sum + (Number(c.appendix_count) || 0), 0);
        window.BimTableFooter.render('contracts-table', {
            cells: [
                { text: 'TỔNG', align: 'center', class: 'font-black text-slate-900 font-heading' },
                { html: `<span class="text-indigo-900 font-extrabold">${items.length}</span> hợp đồng lao động`, colspan: 5, class: 'text-slate-700' },
                { html: `<span class="text-slate-900 font-bold tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalBaseSalary)} đ</span>`, align: 'right' },
                { html: `<span class="text-slate-700 font-bold tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalAllowancesSum)} đ</span>`, align: 'right' },
                { html: `<span class="text-indigo-950 font-black tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalGrossIncome)} đ</span>`, align: 'right' },
                { html: `<span class="text-teal-800 font-bold tabular-nums font-mono">${new Intl.NumberFormat('vi-VN').format(totalInsuranceSalary)} đ</span>`, align: 'right' },
                { text: '', align: 'center' },
                { html: `<span class="font-bold tabular-nums font-mono">${totalAppendixCount}</span>`, align: 'center' },
                { text: '', align: 'center' },
                { text: '', align: 'center' }
            ]
        });
    }
}

// =========================================================================
// MODALS CRUD: HỢP ĐỒNG LAO ĐỘNG, PHỤ LỤC, NGƯỜI PHỤ THUỘC & PHIẾU LƯƠNG
// =========================================================================
// =========================================================================
// PHÂN HỆ QUẢN TRỊ NHÂN SỰ — DEDICATED FULL-PAGE VIEW CONTROLLERS
// (TUÂN THỦ 100%: MỞ TRANG TOÀN MÀN HÌNH, KHÔNG DÙNG MODAL CHE GIAO DIỆN)
// =========================================================================
let cachedEmployeesList = [];
let currentViewingContractId = null;
let currentViewingSlipId = null;

async function populateContractEmployeeDropdown(selectedEmpId = null) {
    try {
        const empSelect = document.getElementById('cd-employee');
        if (!cachedEmployeesList || cachedEmployeesList.length === 0) {
            const res = await fetchWithAuth('/api/personnel/employees/');
            if (res.ok) {
                const data = await res.json();
                cachedEmployeesList = Array.isArray(data) ? data : (data.results || []);
            }
        }
        
        const optionsHtml = '<option value="">-- Chọn nhân sự --</option>' + (cachedEmployeesList || []).map(emp => {
            return `<option value="${emp.id}">[${escapeHtml(emp.code)}] ${escapeHtml(emp.full_name)} (${escapeHtml(emp.role || emp.department || 'Nhân viên')})</option>`;
        }).join('');

        if (empSelect) {
            empSelect.innerHTML = optionsHtml;
            if (selectedEmpId) empSelect.value = selectedEmpId;
        }
    } catch (e) {
        console.error('Lỗi tải danh mục nhân viên:', e);
    }
}

// -------------------------------------------------------------------------
// 1. DEDICATED FULL-PAGE VIEW: HỢP ĐỒNG LAO ĐỘNG (LABOR CONTRACT)
// -------------------------------------------------------------------------
function calculateContractTotalSalary() {
    const baseSal = parseFloat(String(document.getElementById('cd-base-salary')?.value || '0').replace(/\D/g, '')) || 0;
    const allowVal = parseFloat(String(document.getElementById('cd-allowance-amount')?.value || '0').replace(/\D/g, '')) || 0;
    const subVal = parseFloat(String(document.getElementById('cd-subsidy-amount')?.value || '0').replace(/\D/g, '')) || 0;
    const total = baseSal + allowVal + subVal;
    const totalEl = document.getElementById('cd-total-salary');
    if (totalEl) {
        totalEl.value = new Intl.NumberFormat('vi-VN').format(total) + ' đ';
    }
    return total;
}
window.calculateContractTotalSalary = calculateContractTotalSalary;

function getContractTypePrefix(type) {
    if (!type) return 'HDLD';
    const t = String(type).toUpperCase();
    if (t === 'PROBATION') return 'HDTV';
    if (t === 'SEASONAL') return 'HDKV';
    return 'HDLD';
}

async function suggestContractNumber(type = 'DEFINITE_TERM', year = null) {
    const curYear = year || new Date().getFullYear();
    const prefix = getContractTypePrefix(type);
    try {
        const res = await fetchWithAuth(`/api/personnel/contracts/?action=suggest_number&type=${encodeURIComponent(type)}&year=${curYear}`);
        if (res.ok) {
            const data = await res.json();
            if (data.suggested_contract_number) return data.suggested_contract_number;
        }
    } catch (e) {
        console.warn('Lỗi lấy mã HĐ gợi ý từ máy chủ:', e);
    }
    // Fallback tính số tiếp theo nếu mạng chậm
    let maxSeq = 0;
    if (Array.isArray(rawContractsList)) {
        rawContractsList.forEach(c => {
            const num = c.contract_number || '';
            const m = num.match(/\.(\d{1,6})$/);
            if (m) {
                const s = parseInt(m[1], 10);
                if (s > maxSeq) maxSeq = s;
            }
        });
    }
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}.${curYear}.${nextSeq}`;
}

function onContractTypeChange() {
    const contractId = document.getElementById('contract-detail-id')?.value;
    if (contractId) return; // Nếu đang chỉnh sửa HĐ đã có ID thì giữ nguyên
    const type = document.getElementById('cd-type')?.value || 'DEFINITE_TERM';
    const numInput = document.getElementById('cd-number');
    if (!numInput) return;
    const curVal = numInput.value.trim();
    const prefix = getContractTypePrefix(type);

    // Nếu mã hiện tại đang khớp format chuẩn: (HDLD|HDTV|HDKV).\d{4}.\d{4}
    const m = curVal.match(/^(HDLD|HDTV|HDKV)\.(\d{4})\.(\d{4})$/);
    if (m) {
        numInput.value = `${prefix}.${m[2]}.${m[3]}`;
    } else {
        suggestContractNumber(type).then(num => {
            if (numInput && !document.getElementById('contract-detail-id')?.value) {
                numInput.value = num;
            }
        });
    }
}

async function openCreateContractPage(employeeId = null, updateHistory = true) {
    currentViewingContractId = null;
    const form = document.getElementById('form-contract-detail');
    if (form) form.reset();
    
    document.getElementById('contract-detail-id').value = '';
    
    // Tự sinh số HĐ chuẩn: [Loại hợp đồng].[Năm].[SốTT trong năm]
    const curYear = new Date().getFullYear();
    const typeSelect = document.getElementById('cd-type');
    const contractType = typeSelect ? typeSelect.value : 'DEFINITE_TERM';
    const numInput = document.getElementById('cd-number');
    if (numInput) {
        numInput.value = 'Đang tạo mã...';
        suggestContractNumber(contractType, curYear).then(suggested => {
            if (numInput && (numInput.value === 'Đang tạo mã...' || !numInput.value)) {
                numInput.value = suggested;
            }
        }).catch(() => {
            if (numInput && (numInput.value === 'Đang tạo mã...' || !numInput.value)) {
                numInput.value = `HDLD.${curYear}.0001`;
            }
        });
    }

    const today = new Date().toISOString().split('T')[0];
    const signInput = document.getElementById('cd-sign-date');
    const startInput = document.getElementById('cd-start-date');
    if (signInput) signInput.value = today;
    if (startInput) startInput.value = today;

    const baseSal = document.getElementById('cd-base-salary');
    const insSal = document.getElementById('cd-insurance-salary');
    if (baseSal) baseSal.value = '7,000,000';
    if (insSal) insSal.value = '5,000,000';

    const allowEl = document.getElementById('cd-allowance-amount');
    const subEl = document.getElementById('cd-subsidy-amount');
    const probEl = document.getElementById('cd-probation-rate');
    const taxTypeEl = document.getElementById('cd-tax-resident-type');
    const isInsEl = document.getElementById('cd-is-insurance');
    const isTaxEl = document.getElementById('cd-is-taxable');
    const isUnionEl = document.getElementById('cd-is-union');

    if (allowEl) allowEl.value = '0';
    if (subEl) subEl.value = '0';
    if (probEl) probEl.value = '100';
    if (taxTypeEl) taxTypeEl.value = 'RESIDENT';
    if (isInsEl) isInsEl.checked = true;
    if (isTaxEl) isTaxEl.checked = true;
    if (isUnionEl) isUnionEl.checked = false;

    calculateContractTotalSalary();

    const statusBadge = document.getElementById('contract-detail-status-badge');
    if (statusBadge) {
        statusBadge.className = 'px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200';
        statusBadge.innerText = 'Dự Thảo (DRAFT)';
    }

    const appCard = document.getElementById('contract-appendices-card');
    if (appCard) appCard.classList.add('hidden'); // Chưa lưu HĐ gốc thì ẩn phụ lục

    await populateContractEmployeeDropdown(employeeId);

    // Nếu truyền employeeId, tự điền phòng ban & vị trí từ nhân viên nếu có
    if (employeeId && Array.isArray(rawEmployeesList)) {
        const selectedEmp = rawEmployeesList.find(e => String(e.id) === String(employeeId));
        if (selectedEmp) {
            const deptEl = document.getElementById('cd-department');
            const roleEl = document.getElementById('cd-role');
            const jobTitleEl = document.getElementById('cd-job-title');
            if (deptEl && selectedEmp.department) deptEl.value = selectedEmp.department;
            if (roleEl && selectedEmp.role) roleEl.value = selectedEmp.role;
            if (jobTitleEl && !jobTitleEl.value) jobTitleEl.value = selectedEmp.role_label || selectedEmp.role || '';
        }
    }

    // Chuyển View sang view-contract-detail
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const contractView = document.getElementById('view-contract-detail');
    if (contractView) {
        contractView.classList.remove('hidden-view');
        contractView.scrollTop = 0;
        const innerScroll = contractView.querySelector('.overflow-y-auto');
        if (innerScroll) innerScroll.scrollTop = 0;
    }

    setContractFormReadOnly(false);
    
    const editBtn = document.getElementById('btn-contract-edit-bottom');
    if (editBtn) editBtn.classList.add('hidden');
    const saveBtn = document.getElementById('cd-submit-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
        document.getElementById('cd-submit-btn-text').innerText = 'Lưu Hợp Đồng';
    }
    const printBtn = document.getElementById('btn-contract-print-bottom');
    if (printBtn) printBtn.classList.add('hidden');
    const delBtn = document.getElementById('btn-contract-delete-bottom');
    if (delBtn) delBtn.classList.add('hidden');

    if (typeof setTopbarFullpageMode === 'function') {
        setTopbarFullpageMode({
            backFn: backToContracts,
            prefix: 'Hành Chính & Nhân Sự',
            title: 'Ký Hợp Đồng Lao Động Mới',
            subText: '',
            badgesHtml: '',
            actionsHtml: ''
        });
    }
}

async function openContractDetailPage(contractId, updateHistory = true) {
    currentViewingContractId = contractId;

    try {
        const res = await fetchWithAuth(`/api/personnel/contracts/${contractId}/`);
        if (!res.ok) throw new Error('Không thể tải chi tiết hợp đồng');
        const c = await res.json();

        document.getElementById('contract-detail-id').value = c.id;
        document.getElementById('cd-number').value = c.contract_number || '';
        document.getElementById('cd-type').value = c.contract_type || 'DEFINITE_TERM';
        document.getElementById('cd-status').value = c.status || 'ACTIVE';
        if (document.getElementById('cd-department')) document.getElementById('cd-department').value = c.department || 'FLEET';
        if (document.getElementById('cd-role')) document.getElementById('cd-role').value = c.role || 'DRIVER';
        document.getElementById('cd-job-title').value = c.job_title || '';
        document.getElementById('cd-working-address').value = c.working_address || '';
        document.getElementById('cd-sign-date').value = normalizeDateToISO(c.sign_date) || '';
        document.getElementById('cd-start-date').value = normalizeDateToISO(c.start_date) || '';
        document.getElementById('cd-end-date').value = normalizeDateToISO(c.end_date) || '';
        document.getElementById('cd-base-salary').value = new Intl.NumberFormat('vi-VN').format(c.base_salary || 0);
        document.getElementById('cd-insurance-salary').value = new Intl.NumberFormat('vi-VN').format(c.insurance_salary || 0);
        
        if (document.getElementById('cd-allowance-amount')) document.getElementById('cd-allowance-amount').value = new Intl.NumberFormat('vi-VN').format(c.allowance_amount || 0);
        if (document.getElementById('cd-subsidy-amount')) document.getElementById('cd-subsidy-amount').value = new Intl.NumberFormat('vi-VN').format(c.subsidy_amount || 0);
        if (document.getElementById('cd-probation-rate')) document.getElementById('cd-probation-rate').value = c.probation_rate || 100;
        if (document.getElementById('cd-tax-resident-type')) document.getElementById('cd-tax-resident-type').value = c.tax_resident_type || 'RESIDENT';
        if (document.getElementById('cd-is-insurance')) document.getElementById('cd-is-insurance').checked = c.is_social_insurance_participant !== false;
        if (document.getElementById('cd-is-taxable')) document.getElementById('cd-is-taxable').checked = c.is_taxable !== false;
        if (document.getElementById('cd-is-union')) document.getElementById('cd-is-union').checked = c.is_union_member === true;

        calculateContractTotalSalary();
        document.getElementById('cd-notes').value = c.allowance_notes || c.notes || '';

        const statusBadge = document.getElementById('contract-detail-status-badge');
        if (statusBadge) {
            if (c.status === 'ACTIVE') {
                statusBadge.className = 'px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                statusBadge.innerText = 'Đang Hiệu Lực';
            } else if (c.status === 'EXPIRED') {
                statusBadge.className = 'px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300';
                statusBadge.innerText = 'Đã Hết Hạn';
            } else {
                statusBadge.className = 'px-3 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200';
                statusBadge.innerText = c.status_label || c.status;
            }
        }

        await populateContractEmployeeDropdown(c.employee);

        // Lưu mã phụ lục gợi ý theo chuẩn [Mã HĐ].PL[SốTT]
        if (c.suggested_appendix_number) {
            window._currentContractSuggestedAppendix = c.suggested_appendix_number;
        } else {
            const numHĐ = c.contract_number || '';
            const nextPl = (c.appendices ? c.appendices.length : 0) + 1;
            window._currentContractSuggestedAppendix = `${numHĐ}.PL${nextPl}`;
        }

        // Hiển thị danh sách Phụ Lục HĐ
        const appCard = document.getElementById('contract-appendices-card');
        if (appCard) appCard.classList.remove('hidden');
        renderContractAppendicesList(c.appendices || []);

        // Chuyển sang View view-contract-detail
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
        const contractView = document.getElementById('view-contract-detail');
        if (contractView) {
            contractView.classList.remove('hidden-view');
            contractView.scrollTop = 0;
            const innerScroll = contractView.querySelector('.overflow-y-auto');
            if (innerScroll) innerScroll.scrollTop = 0;
        }

        // Khóa form ở chế độ xem (ReadOnly) và hiện cụm 4 nút chuẩn [Sửa, Lưu, In, Xóa]
        setContractFormReadOnly(true);

        if (typeof setTopbarFullpageMode === 'function') {
            setTopbarFullpageMode({
                backFn: backToContracts,
                prefix: 'Hành Chính & Nhân Sự',
                title: `Hợp Đồng Lao Động | ${c.contract_number} (${c.employee_name || ''})`,
                subText: '',
                badgesHtml: '',
                actionsHtml: ''
            });
        }
    } catch (e) {
        console.error('Lỗi mở chi tiết hợp đồng:', e);
        showToast('error', e.message || 'Không thể mở chi tiết hợp đồng.', 'Lỗi');
    }
}

function renderContractAppendicesList(appendices) {
    const tbody = document.getElementById('contract-appendices-tbody');
    if (!tbody) return;

    if (!appendices || appendices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">Chưa có phụ lục hợp đồng nào được ký kết.</td></tr>`;
        return;
    }

    tbody.innerHTML = appendices.map((app, idx) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-2 px-3 text-center font-mono font-bold text-slate-500">${idx + 1}</td>
            <td class="py-2 px-3 font-mono font-bold text-indigo-900">${escapeHtml(app.appendix_number)}</td>
            <td class="py-2 px-3 text-center font-mono">${escapeHtml(app.effective_date || '—')}</td>
            <td class="py-2 px-3 text-right font-mono font-bold text-indigo-950">${app.new_base_salary ? new Intl.NumberFormat('vi-VN').format(app.new_base_salary) + ' đ' : '—'}</td>
            <td class="py-2 px-3 text-right font-mono font-bold text-teal-800">${app.new_insurance_salary ? new Intl.NumberFormat('vi-VN').format(app.new_insurance_salary) + ' đ' : '—'}</td>
            <td class="py-2 px-3 font-medium text-slate-800">${escapeHtml(app.new_role || '—')}</td>
            <td class="py-2 px-3 text-slate-600">${escapeHtml(app.department_label || app.new_department || '—')}</td>
            <td class="py-2 px-3 text-slate-600 max-w-xs truncate">${escapeHtml(app.change_summary || '—')}</td>
        </tr>
    `).join('');
}

function setContractFormReadOnly(isReadOnly) {
    const form = document.getElementById('form-contract-detail');
    if (form) {
        form.querySelectorAll('input:not(#contract-detail-id):not(#cd-total-salary), select, textarea').forEach(el => {
            el.disabled = isReadOnly;
            if (isReadOnly) {
                el.classList.add('bg-slate-50', 'cursor-not-allowed');
            } else {
                el.classList.remove('bg-slate-50', 'cursor-not-allowed');
            }
        });
    }

    const editBtn = document.getElementById('btn-contract-edit-bottom');
    const saveBtn = document.getElementById('cd-submit-btn');
    const printBtn = document.getElementById('btn-contract-print-bottom');
    const delBtn = document.getElementById('btn-contract-delete-bottom');

    if (isReadOnly) {
        if (editBtn) editBtn.classList.remove('hidden');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            document.getElementById('cd-submit-btn-text').innerText = 'Lưu';
        }
        if (printBtn) printBtn.classList.remove('hidden');
        if (delBtn) delBtn.classList.remove('hidden');
    } else {
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            document.getElementById('cd-submit-btn-text').innerText = 'Lưu';
        }
    }
}

function enableContractEdit() {
    setContractFormReadOnly(false);
    showToast('info', 'Đã bật chế độ chỉnh sửa hợp đồng. Vui lòng bấm "Lưu" sau khi cập nhật.', 'Chế Độ Sửa');
}

async function submitContractDetailForm(event) {
    if (event && event.preventDefault) event.preventDefault();
    const contractId = document.getElementById('contract-detail-id').value;
    const isEdit = !!contractId;

    const baseSalClean = String(document.getElementById('cd-base-salary').value || '0').replace(/\D/g, '');
    const insSalClean = String(document.getElementById('cd-insurance-salary').value || '0').replace(/\D/g, '');
    const allowClean = String(document.getElementById('cd-allowance-amount')?.value || '0').replace(/\D/g, '');
    const subClean = String(document.getElementById('cd-subsidy-amount')?.value || '0').replace(/\D/g, '');

    const payload = {
        contract_number: document.getElementById('cd-number').value.trim(),
        employee: parseInt(document.getElementById('cd-employee').value),
        contract_type: document.getElementById('cd-type').value,
        status: document.getElementById('cd-status').value,
        department: document.getElementById('cd-department')?.value || 'FLEET',
        role: document.getElementById('cd-role')?.value || 'DRIVER',
        job_title: document.getElementById('cd-job-title').value.trim(),
        working_address: document.getElementById('cd-working-address').value.trim(),
        sign_date: normalizeDateToISO(document.getElementById('cd-sign-date').value),
        start_date: normalizeDateToISO(document.getElementById('cd-start-date').value),
        end_date: normalizeDateToISO(document.getElementById('cd-end-date').value) || null,
        base_salary: parseFloat(baseSalClean) || 0,
        insurance_salary: parseFloat(insSalClean) || 0,
        allowance_amount: parseFloat(allowClean) || 0,
        subsidy_amount: parseFloat(subClean) || 0,
        probation_rate: parseFloat(document.getElementById('cd-probation-rate')?.value) || 100,
        tax_resident_type: document.getElementById('cd-tax-resident-type')?.value || 'RESIDENT',
        is_social_insurance_participant: document.getElementById('cd-is-insurance')?.checked !== false,
        is_taxable: document.getElementById('cd-is-taxable')?.checked !== false,
        is_union_member: document.getElementById('cd-is-union')?.checked === true,
        allowance_notes: document.getElementById('cd-notes').value.trim()
    };

    if (!payload.employee) {
        showToast('warning', 'Vui lòng chọn nhân viên ký hợp đồng.', 'Chú ý');
        return;
    }

    try {
        const url = isEdit ? `/api/personnel/contracts/${contractId}/` : '/api/personnel/contracts/';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            const errDetail = data.errors ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join('; ') : data.message;
            throw new Error(errDetail || 'Không thể lưu hợp đồng.');
        }

        showToast('success', data.message || 'Đã lưu hợp đồng lao động thành công!', 'Thành Công');
        await loadContractsData();
        await loadEmployeesData();

        if (!isEdit && data.data && data.data.id) {
            openContractDetailPage(data.data.id);
        } else {
            setContractFormReadOnly(true);
        }
    } catch (e) {
        console.error('Lỗi lưu hợp đồng:', e);
        showToast('error', e.message || 'Lỗi lưu thông tin hợp đồng.', 'Lỗi Thao Tác');
    }
}

async function confirmDeleteContract() {
    const contractId = document.getElementById('contract-detail-id').value;
    if (!contractId) return;

    let confirmed = false;
    if (typeof showConfirmModal === 'function') {
        confirmed = await showConfirmModal({
            title: 'Chấm Dứt / Xóa Hợp Đồng',
            message: 'Bạn có chắc chắn muốn chuyển trạng thái hợp đồng này sang TERMINATED (Đã chấm dứt)?',
            confirmText: 'Chấm Dứt HĐ',
            cancelText: 'Huỷ Bỏ',
            type: 'danger',
            icon: 'ph-bold ph-x-circle text-2xl'
        });
    } else {
        confirmed = confirm('Bạn có chắc chắn muốn chấm dứt hợp đồng lao động này?');
    }

    if (!confirmed) return;

    try {
        const res = await fetchWithAuth(`/api/personnel/contracts/${contractId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'TERMINATED' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi chấm dứt hợp đồng');

        showToast('success', 'Đã chấm dứt hiệu lực hợp đồng thành công.', 'Đã Cập Nhật');
        await loadContractsData();
        await loadEmployeesData();
        backToContracts();
    } catch (e) {
        console.error('Lỗi kết thúc HĐ:', e);
        showToast('error', e.message || 'Không thể chấm dứt hợp đồng.', 'Lỗi');
    }
}

function backToContracts() {
    const contractView = document.getElementById('view-contract-detail');
    if (contractView) contractView.classList.add('hidden-view');

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    const personnelView = document.getElementById('view-nhan-su');
    if (personnelView) personnelView.classList.remove('hidden-view');

    if (typeof resetTopbarStandardMode === 'function') {
        resetTopbarStandardMode('nhan-su');
    }

    if (typeof switchHRSubTab === 'function') {
        switchHRSubTab('contracts');
    }
}

function toggleAddAppendixInline() {
    const box = document.getElementById('inline-appendix-box');
    if (!box) return;

    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
        const numHĐ = document.getElementById('cd-number')?.value.trim() || '';
        
        let suggestedPl = window._currentContractSuggestedAppendix;
        if (!suggestedPl || !suggestedPl.startsWith(numHĐ)) {
            const tbody = document.getElementById('contract-appendices-tbody');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];
            let maxPl = 0;
            rows.forEach(r => {
                const txt = r.innerText || '';
                const m = txt.match(/\.PL(\d+)/i) || txt.match(/PL-?(\d+)/i);
                if (m) {
                    const s = parseInt(m[1], 10);
                    if (s > maxPl) maxPl = s;
                }
            });
            if (maxPl === 0) {
                const validRows = Array.from(rows).filter(r => !r.innerText.includes('Chưa có phụ lục'));
                maxPl = validRows.length;
            }
            suggestedPl = `${numHĐ}.PL${maxPl + 1}`;
        }

        document.getElementById('inline-app-number').value = suggestedPl;
        document.getElementById('inline-app-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('inline-app-salary').value = document.getElementById('cd-base-salary')?.value || '';
        document.getElementById('inline-app-insurance-salary').value = document.getElementById('cd-insurance-salary')?.value || '';
        document.getElementById('inline-app-allowance').value = document.getElementById('cd-allowance-amount')?.value || '0';
        document.getElementById('inline-app-subsidy').value = document.getElementById('cd-subsidy-amount')?.value || '0';
        document.getElementById('inline-app-department').value = document.getElementById('cd-department')?.value || '';
        document.getElementById('inline-app-role').value = document.getElementById('cd-job-title')?.value || document.getElementById('cd-role')?.value || '';
        document.getElementById('inline-app-summary').value = '';
    }
}

async function submitInlineAppendix() {
    const contractId = document.getElementById('contract-detail-id').value;
    if (!contractId) {
        showToast('warning', 'Vui lòng lưu hợp đồng gốc trước khi ký phụ lục.', 'Chú ý');
        return;
    }

    const salClean = String(document.getElementById('inline-app-salary')?.value || '').replace(/\D/g, '');
    const insClean = String(document.getElementById('inline-app-insurance-salary')?.value || '').replace(/\D/g, '');
    const allowClean = String(document.getElementById('inline-app-allowance')?.value || '').replace(/\D/g, '');
    const subClean = String(document.getElementById('inline-app-subsidy')?.value || '').replace(/\D/g, '');

    const numHĐ = document.getElementById('cd-number')?.value.trim() || '';
    let appNum = document.getElementById('inline-app-number').value.trim();
    if (!appNum) {
        appNum = window._currentContractSuggestedAppendix || `${numHĐ}.PL1`;
    }

    const payload = {
        contract: parseInt(contractId),
        appendix_number: appNum,
        effective_date: normalizeDateToISO(document.getElementById('inline-app-date').value),
        new_base_salary: salClean ? parseFloat(salClean) : null,
        new_insurance_salary: insClean ? parseFloat(insClean) : null,
        new_allowance_amount: allowClean ? parseFloat(allowClean) : null,
        new_subsidy_amount: subClean ? parseFloat(subClean) : null,
        new_department: document.getElementById('inline-app-department')?.value || '',
        new_role: document.getElementById('inline-app-role')?.value.trim() || '',
        change_summary: document.getElementById('inline-app-summary').value.trim()
    };

    if (!payload.appendix_number || !payload.effective_date || !payload.change_summary) {
        showToast('warning', 'Vui lòng nhập đầy đủ Số phụ lục, Ngày hiệu lực và Nội dung điều chỉnh.', 'Thiếu thông tin');
        return;
    }

    try {
        const res = await fetchWithAuth('/api/personnel/appendices/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Lỗi thêm phụ lục hợp đồng');

        showToast('success', data.message || 'Đã thêm phụ lục hợp đồng thành công.', 'Thành Công');
        toggleAddAppendixInline();
        openContractDetailPage(contractId);
    } catch (err) {
        console.error('Lỗi lưu phụ lục:', err);
        showToast('error', err.message || 'Không thể lưu phụ lục hợp đồng.', 'Lỗi');
    }
}

function openDirectPrintContract(contractId) {
    const c = (rawContractsList || []).find(item => item.id === contractId);
    if (!c) {
        showToast('warning', 'Không tìm thấy thông tin hợp đồng để in.', 'Lỗi In');
        return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
        showToast('error', 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép để in hợp đồng.', 'Lỗi Popup');
        return;
    }

    const co = getSystemCompanyProfile();
    const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Hợp Đồng Lao Động - ${c.contract_number}</title>
            <style>
                @page { size: A4 portrait; margin: 20mm; }
                body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; color: #000; margin: 0; padding: 20px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .uppercase { text-transform: uppercase; }
                .header-title { font-size: 15pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
                .sub-title { font-style: italic; font-size: 12pt; margin-bottom: 20px; }
                .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-decoration: underline; }
                .sig-container { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
                .sig-box { width: 45%; }
            </style>
        </head>
        <body>
            <div class="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</div>
            <div class="text-center" style="margin-top: 5px;">----------o0o----------</div>
            
            <div class="text-center header-title">HỢP ĐỒNG LAO ĐỘNG</div>
            <div class="text-center sub-title">Số: ${c.contract_number} / HĐLĐ-TVL</div>

            <p>Hôm nay, ngày ${c.sign_date ? c.sign_date.split('-').reverse().join('/') : '.....'}, chúng tôi gồm có:</p>
            
            <div class="section-title">BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG):</div>
            <div><strong>${co.company_name.toUpperCase()}</strong></div>
            <div>Địa chỉ: ${co.address || 'Trụ sở chính công ty'}</div>
            <div>Đại diện bởi: <strong>${co.representative_name || 'Ban Giám Đốc'}</strong> — Chức vụ: ${co.representative_role || 'Đại diện pháp luật'}</div>
            <div>Mã số thuế: ${co.tax_code || '—'} | Điện thoại: ${co.phone || '—'}</div>

            <div class="section-title">BÊN B (NGƯỜI LAO ĐỘNG):</div>
            <div>Họ và tên: <strong>${c.employee_name || '—'}</strong> (${c.employee_code || ''})</div>
            <div>Vị trí / Chức danh công tác: <strong>${c.job_title || 'Nhân viên'}</strong></div>
            <div>Địa điểm làm việc: ${c.working_address || 'Theo điều động sản xuất kinh doanh của công ty'}</div>

            <div class="section-title">ĐIỀU KHOẢN HỢP ĐỒNG:</div>
            <div>1. Loại hợp đồng: <strong>${c.contract_type_label || c.contract_type}</strong></div>
            <div>2. Thời hạn hiệu lực: Từ ngày ${c.start_date ? c.start_date.split('-').reverse().join('/') : '.....'} ${c.end_date ? 'đến ngày ' + c.end_date.split('-').reverse().join('/') : '(Không xác định thời hạn)'}</div>
            <div>3. Mức lương căn bản theo HĐ: <strong>${new Intl.NumberFormat('vi-VN').format(c.base_salary || 0)} VNĐ/tháng</strong></div>
            <div>4. Mức lương căn cứ đóng BHXH: <strong>${new Intl.NumberFormat('vi-VN').format(c.insurance_salary || 0)} VNĐ/tháng</strong></div>
            <div>5. Chế độ phụ cấp & thưởng: ${c.allowance_notes || 'Thực hiện theo Quy chế phân phối tiền lương của công ty.'}</div>

            <div class="sig-container">
                <div class="sig-box">
                    <strong>NGƯỜI LAO ĐỘNG</strong><br>
                    <i>(Ký và ghi rõ họ tên)</i>
                </div>
                <div class="sig-box">
                    <strong>ĐẠI DIỆN BÊN A</strong><br>
                    <i>(Ký, đóng dấu và ghi rõ họ tên)</i>
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
}

function printCurrentContract() {
    const contractId = document.getElementById('contract-detail-id')?.value;
    if (contractId) {
        openDirectPrintContract(parseInt(contractId));
    }
}


// =========================================================================
// GSS LOGISTICS — SEARCH & FILTER HELPER FUNCTIONS FOR TABLES
// =========================================================================
function filterContractsTable() {
    const q = (document.getElementById('contract-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#contracts-tbody tr');
    rows.forEach(r => {
        if (!q) { r.style.display = ''; return; }
        r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}
